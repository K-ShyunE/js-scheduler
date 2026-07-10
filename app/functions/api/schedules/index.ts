import { z } from "zod";
import { badRequest, json, readJson, serverError } from "../../_shared/http";
import { createId } from "../../_shared/ids";
import { mapScheduleView } from "../../_shared/mappers";
import { scheduleViewSelect } from "../../_shared/queries";
import type { AppPagesFunction, ScheduleViewRow } from "../../_shared/types";
import { getSessionUser } from "../../_shared/auth";
import { decryptSecret } from "../../_shared/crypto";
import {
  refreshGoogleAccessToken,
  writeGoogleSheetRow,
  ensureGoogleSheetHeaders,
  createGoogleCalendarEvent,
  updateGoogleSheetRow,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from "../../_shared/google";

const scheduleCreateSchema = z.object({
  productName: z.string().min(1),
  brandName: z.string().optional(),
  partnerId: z.string().min(1),
  channelId: z.string().min(1),
  saleDate: z.string().min(1),
  saleStartTime: z.string().min(1),
  saleEndTime: z.string().optional(),
  shipmentDate: z.string().optional(),
  quantity: z.coerce.number().int().nonnegative(),
  memo: z.string().optional(),
  skipSync: z.boolean().optional(),
});

const scheduleUpdateSchema = z.object({
  id: z.string().min(1),
  productName: z.string().min(1),
  brandName: z.string().optional(),
  partnerId: z.string().min(1),
  channelId: z.string().min(1),
  saleDate: z.string().min(1),
  saleStartTime: z.string().min(1),
  saleEndTime: z.string().optional(),
  shipmentDate: z.string().optional(),
  quantity: z.coerce.number().int().nonnegative(),
  memo: z.string().optional(),
});

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim().toLowerCase();

    const baseSql = `
      ${scheduleViewSelect}
      WHERE schedules.created_by = ?
      ${
        query
          ? `
              AND (
                LOWER(products.name) LIKE ?
                OR LOWER(products.brand_name) LIKE ?
                OR LOWER(partners.name) LIKE ?
                OR LOWER(channels.name) LIKE ?
                OR LOWER(COALESCE(schedules.memo, '')) LIKE ?
              )
            `
          : ""
      }
      ORDER BY schedules.sale_date ASC, schedules.sale_start_time ASC
    `;

    const statement = env.DB.prepare(baseSql);
    const wildcard = `%${query ?? ""}%`;
    const { results } = query
      ? await statement
          .bind(sessionUser.id, wildcard, wildcard, wildcard, wildcard, wildcard)
          .all<ScheduleViewRow>()
      : await statement.bind(sessionUser.id).all<ScheduleViewRow>();

    return json({ data: results.map(mapScheduleView) });
  } catch (error) {
    return serverError(error);
  }
};

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const input = await readJson<unknown>(request);
    const parsed = scheduleCreateSchema.safeParse(input);

    if (!parsed.success) {
      return badRequest("일정 등록 값이 올바르지 않습니다.", parsed.error.flatten());
    }

    const data = parsed.data;
    const now = new Date().toISOString();
    const productId = createId("product");
    const scheduleId = createId("schedule");

    // 파트너 및 채널 정보 상세 조회 (이름 및 약칭)
    const partnerInfo = await env.DB.prepare("SELECT name, contact_name FROM partners WHERE id = ?")
      .bind(data.partnerId)
      .first<{ name: string; contact_name: string | null }>();
    const channelInfo = await env.DB.prepare("SELECT name, alias FROM channels WHERE id = ?")
      .bind(data.channelId)
      .first<{ name: string; alias: string | null }>();

    const partnerName = partnerInfo?.name || "";
    const partnerAlias = partnerInfo?.contact_name || partnerInfo?.name || "";
    const channelName = channelInfo?.name || "";
    const channelAlias = channelInfo?.alias || channelInfo?.name || "";

    const resolvedBrandName = data.brandName || partnerName || "";

    // 1. D1 DB에 기본정보 삽입 (batch 트랜잭션)
    await env.DB.batch([
      env.DB.prepare(
        `
          INSERT INTO products (
            id, name, brand_name, partner_id, user_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      ).bind(productId, data.productName, resolvedBrandName, data.partnerId, sessionUser.id, now, now),
      env.DB.prepare(
        `
          INSERT INTO schedules (
            id,
            product_id,
            partner_id,
            channel_id,
            sale_date,
            sale_start_time,
            sale_end_time,
            shipment_date,
            quantity,
            status,
            memo,
            sync_status,
            created_by,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, 'sync_pending', ?, ?, ?)
        `,
      ).bind(
        scheduleId,
        productId,
        data.partnerId,
        data.channelId,
        data.saleDate,
        data.saleStartTime,
        data.saleEndTime || data.saleStartTime,
        data.shipmentDate || "",
        data.quantity,
        data.memo?.trim() || null,
        sessionUser.id,
        now,
        now,
      ),
    ]);

    // 2. Google OAuth 연동 설정 조회
    const connection = await env.DB.prepare(
      `SELECT encrypted_refresh_token, spreadsheet_id, calendar_id, shipment_calendar_id FROM google_connections WHERE user_id = ?`
    )
      .bind(sessionUser.id)
      .first<{ encrypted_refresh_token: string; spreadsheet_id: string | null; calendar_id: string | null; shipment_calendar_id: string | null }>();

    let syncStatus: "not_synced" | "synced" | "sync_failed" | "sync_pending" = "not_synced";
    let googleSheetRowId: string | null = null;
    let googleCalendarEventId: string | null = null;
    let googleCalendarShipmentEventId: string | null = null;

    const hasSheetsTarget = !!connection?.spreadsheet_id;
    const hasCalendarTarget = !!connection?.calendar_id;
    const hasShipmentCalendarTarget = !!connection?.shipment_calendar_id && !!data.shipmentDate;

    if (!data.skipSync && connection && (hasSheetsTarget || hasCalendarTarget || hasShipmentCalendarTarget)) {
      try {
        const decryptedRefreshToken = await decryptSecret(connection.encrypted_refresh_token, env);
        const tokenResult = await refreshGoogleAccessToken(env, decryptedRefreshToken);
        const accessToken = tokenResult.access_token;

        let sheetsSuccess = true;
        let calendarSuccess = true;
        let shipmentCalendarSuccess = true;
        let sheetsErrorMsg = "";
        let calendarErrorMsg = "";
        let shipmentCalendarErrorMsg = "";

        // Google Sheets 동기화 수행
        if (hasSheetsTarget && accessToken) {
          try {
            const kstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            const formattedNow = kstDate.toISOString().replace("T", " ").substring(0, 16);

            await ensureGoogleSheetHeaders(accessToken, connection.spreadsheet_id!, [
              "판매일자",
              "판매시간",
              "채널명",
              "업체명",
              "상품명",
              "수량",
              "출고일자",
              "등록일시"
            ]);

            googleSheetRowId = await writeGoogleSheetRow(accessToken, connection.spreadsheet_id!, [
              data.saleDate,
              data.saleStartTime,
              channelName,
              partnerName,
              data.productName,
              data.quantity,
              data.shipmentDate || "",
              formattedNow
            ]);

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'sheets', 'create', 'success', 'Google Sheets 행 작성 완료', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, googleSheetRowId, new Date().toISOString())
              .run();
          } catch (e) {
            sheetsSuccess = false;
            sheetsErrorMsg = e instanceof Error ? e.message : "Sheets API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'sheets', 'create', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, `Google Sheets 작성 실패: ${sheetsErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // Google Calendar 방송일정 동기화 수행
        if (hasCalendarTarget && accessToken) {
          try {
            const startDateTime = `${data.saleDate}T${data.saleStartTime}:00`;
            const endDateTime = `${data.saleDate}T${data.saleEndTime || data.saleStartTime}:00`;

            const broadcastTitle = `[${channelAlias}_${partnerAlias}] ${data.productName}`;
            const broadcastDescription = `제품: ${data.productName}\n홈쇼핑: ${channelName}\n업체: ${partnerName}\n수량: ${data.quantity}`;

            googleCalendarEventId = await createGoogleCalendarEvent(accessToken, connection.calendar_id!, {
              title: broadcastTitle,
              description: broadcastDescription,
              startDateTime,
              endDateTime,
            });

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'calendar', 'create', 'success', 'Google Calendar 방송 일정 생성 완료', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, googleCalendarEventId, new Date().toISOString())
              .run();
          } catch (e) {
            calendarSuccess = false;
            calendarErrorMsg = e instanceof Error ? e.message : "Calendar API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'calendar', 'create', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, `Google Calendar 방송 일정 생성 실패: ${calendarErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // Google Calendar 출고일정 동기화 수행
        if (hasShipmentCalendarTarget && accessToken) {
          try {
            const startDate = data.shipmentDate!;
            const sDate = new Date(`${startDate}T00:00:00`);
            sDate.setDate(sDate.getDate() + 1);
            const endDate = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, "0")}-${String(sDate.getDate()).padStart(2, "0")}`;

            const [year, month, day] = data.saleDate.split("-");
            const formattedSaleDate = `${parseInt(month, 10)}/${parseInt(day, 10)}`;
            const shipmentTitle = `[${channelAlias}_${partnerAlias}] ${formattedSaleDate} ${data.productName}`;
            const shipmentDescription = `제품: ${data.productName}\n홈쇼핑: ${channelName}\n업체: ${partnerName}\n수량: ${data.quantity}`;

            googleCalendarShipmentEventId = await createGoogleCalendarEvent(accessToken, connection.shipment_calendar_id!, {
              title: shipmentTitle,
              description: shipmentDescription,
              startDate,
              endDate,
            });

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'calendar', 'create', 'success', 'Google Calendar 출고 일정 생성 완료', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, googleCalendarShipmentEventId, new Date().toISOString())
              .run();
          } catch (e) {
            shipmentCalendarSuccess = false;
            shipmentCalendarErrorMsg = e instanceof Error ? e.message : "Calendar API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'calendar', 'create', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), scheduleId, `Google Calendar 출고 일정 생성 실패: ${shipmentCalendarErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // 동기화 상태 판정
        const activeTargetsCount = (hasSheetsTarget ? 1 : 0) + (hasCalendarTarget ? 1 : 0) + (hasShipmentCalendarTarget ? 1 : 0);
        const successTargetsCount = (hasSheetsTarget && sheetsSuccess ? 1 : 0) + (hasCalendarTarget && calendarSuccess ? 1 : 0) + (hasShipmentCalendarTarget && shipmentCalendarSuccess ? 1 : 0);

        if (successTargetsCount === activeTargetsCount) {
          syncStatus = "synced";
        } else {
          syncStatus = "sync_failed";
        }

      } catch (err) {
        syncStatus = "sync_failed";
        const errMsg = err instanceof Error ? err.message : "인증 실패";

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO sync_logs (id, schedule_id, target, operation, status, message, created_at) VALUES (?, ?, 'sheets', 'create', 'failed', ?, ?)`
          ).bind(createId("sync"), scheduleId, `인증 및 연결 오류로 동기화 실패: ${errMsg}`, new Date().toISOString()),
          env.DB.prepare(
            `INSERT INTO sync_logs (id, schedule_id, target, operation, status, message, created_at) VALUES (?, ?, 'calendar', 'create', 'failed', ?, ?)`
          ).bind(createId("sync"), scheduleId, `인증 및 연결 오류로 동기화 실패: ${errMsg}`, new Date().toISOString()),
        ]);
      }
    } else {
      syncStatus = "not_synced";
    }

    // 최종 schedule의 sync_status 및 google ID 필드 업데이트
    await env.DB.prepare(
      `
        UPDATE schedules
        SET
          sync_status = ?,
          google_sheet_row_id = ?,
          google_calendar_event_id = ?,
          google_calendar_shipment_event_id = ?
        WHERE id = ?
      `
    )
      .bind(syncStatus, googleSheetRowId, googleCalendarEventId, googleCalendarShipmentEventId, scheduleId)
      .run();

    const row = await env.DB.prepare(`${scheduleViewSelect} WHERE schedules.id = ?`)
      .bind(scheduleId)
      .first<ScheduleViewRow>();

    return json({ data: row ? mapScheduleView(row) : null }, { status: 201 });
  } catch (error) {
    console.error("[SCHEDULE CREATE ERROR]", error);
    return serverError(error);
  }
};

export const onRequestPut: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const body = await readJson(request);
    const parsed = scheduleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.message);
    }

    const data = parsed.data;
    const now = new Date().toISOString();

    // 1. 기존 스케줄 및 연동 ID 조회
    const oldSchedule = await env.DB.prepare(
      "SELECT product_id, google_sheet_row_id, google_calendar_event_id, google_calendar_shipment_event_id FROM schedules WHERE id = ? AND created_by = ?"
    )
      .bind(data.id, sessionUser.id)
      .first<{
        product_id: string;
        google_sheet_row_id: string | null;
        google_calendar_event_id: string | null;
        google_calendar_shipment_event_id: string | null;
      }>();

    if (!oldSchedule) {
      return json({ error: { message: "일정을 찾을 수 없습니다." } }, { status: 404 });
    }

    const productId = oldSchedule.product_id;

    // 파트너 및 채널 정보 상세 조회 (이름 및 약칭)
    const partnerInfo = await env.DB.prepare("SELECT name, contact_name FROM partners WHERE id = ?")
      .bind(data.partnerId)
      .first<{ name: string; contact_name: string | null }>();
    const channelInfo = await env.DB.prepare("SELECT name, alias FROM channels WHERE id = ?")
      .bind(data.channelId)
      .first<{ name: string; alias: string | null }>();

    const partnerName = partnerInfo?.name || "";
    const partnerAlias = partnerInfo?.contact_name || partnerInfo?.name || "";
    const channelName = channelInfo?.name || "";
    const channelAlias = channelInfo?.alias || channelInfo?.name || "";

    const resolvedBrandName = data.brandName || partnerName || "";

    // 2. D1 DB 업데이트 (제품 및 일정)
    await env.DB.batch([
      env.DB.prepare(
        `
          UPDATE products
          SET name = ?, brand_name = ?, partner_id = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `
      ).bind(data.productName, resolvedBrandName, data.partnerId, now, productId, sessionUser.id),
      env.DB.prepare(
        `
          UPDATE schedules
          SET
            partner_id = ?,
            channel_id = ?,
            sale_date = ?,
            sale_start_time = ?,
            sale_end_time = ?,
            shipment_date = ?,
            quantity = ?,
            memo = ?,
            updated_at = ?
          WHERE id = ? AND created_by = ?
        `
      ).bind(
        data.partnerId,
        data.channelId,
        data.saleDate,
        data.saleStartTime,
        data.saleEndTime || data.saleStartTime,
        data.shipmentDate || "",
        data.quantity,
        data.memo?.trim() || null,
        now,
        data.id,
        sessionUser.id
      ),
    ]);

    // 3. Google OAuth 연동 설정 조회
    const connection = await env.DB.prepare(
      `SELECT encrypted_refresh_token, spreadsheet_id, calendar_id, shipment_calendar_id FROM google_connections WHERE user_id = ?`
    )
      .bind(sessionUser.id)
      .first<{ encrypted_refresh_token: string; spreadsheet_id: string | null; calendar_id: string | null; shipment_calendar_id: string | null }>();

    let syncStatus: "not_synced" | "synced" | "sync_failed" | "sync_pending" = "not_synced";
    let googleSheetRowId: string | null = oldSchedule.google_sheet_row_id;
    let googleCalendarEventId: string | null = oldSchedule.google_calendar_event_id;
    let googleCalendarShipmentEventId: string | null = oldSchedule.google_calendar_shipment_event_id;

    const hasSheetsTarget = !!connection?.spreadsheet_id;
    const hasCalendarTarget = !!connection?.calendar_id;
    const hasShipmentCalendarTarget = !!connection?.shipment_calendar_id;

    if (connection && (hasSheetsTarget || hasCalendarTarget || hasShipmentCalendarTarget)) {
      try {
        const decryptedRefreshToken = await decryptSecret(connection.encrypted_refresh_token, env);
        const tokenResult = await refreshGoogleAccessToken(env, decryptedRefreshToken);
        const accessToken = tokenResult.access_token;

        let sheetsSuccess = true;
        let calendarSuccess = true;
        let shipmentCalendarSuccess = true;
        let sheetsErrorMsg = "";
        let calendarErrorMsg = "";
        let shipmentCalendarErrorMsg = "";

        // Google Sheets 동기화 수행
        if (hasSheetsTarget && accessToken) {
          try {
            const kstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
            const formattedNow = kstDate.toISOString().replace("T", " ").substring(0, 16);

            const rowValues = [
              data.saleDate,
              data.saleStartTime,
              channelName,
              partnerName,
              data.productName,
              data.quantity,
              data.shipmentDate || "",
              formattedNow
            ];

            if (googleSheetRowId) {
              await updateGoogleSheetRow(accessToken, connection.spreadsheet_id!, googleSheetRowId, rowValues);
            } else {
              googleSheetRowId = await writeGoogleSheetRow(accessToken, connection.spreadsheet_id!, rowValues);
            }

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'sheets', 'update', 'success', 'Google Sheets 업데이트 완료', ?, ?)
              `
            )
              .bind(createId("sync"), data.id, googleSheetRowId, new Date().toISOString())
              .run();
          } catch (e) {
            sheetsSuccess = false;
            sheetsErrorMsg = e instanceof Error ? e.message : "Sheets API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'sheets', 'update', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), data.id, `Google Sheets 업데이트 실패: ${sheetsErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // Google Calendar 방송일정 동기화 수행
        if (hasCalendarTarget && accessToken) {
          try {
            const startDateTime = `${data.saleDate}T${data.saleStartTime}:00`;
            const endDateTime = `${data.saleDate}T${data.saleEndTime || data.saleStartTime}:00`;

            const broadcastTitle = `[${channelAlias}_${partnerAlias}] ${data.productName}`;
            const broadcastDescription = `제품: ${data.productName}\n홈쇼핑: ${channelName}\n업체: ${partnerName}\n수량: ${data.quantity}`;

            if (googleCalendarEventId) {
              await updateGoogleCalendarEvent(accessToken, connection.calendar_id!, googleCalendarEventId, {
                title: broadcastTitle,
                description: broadcastDescription,
                startDateTime,
                endDateTime,
              });
            } else {
              googleCalendarEventId = await createGoogleCalendarEvent(accessToken, connection.calendar_id!, {
                title: broadcastTitle,
                description: broadcastDescription,
                startDateTime,
                endDateTime,
              });
            }

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'calendar', 'update', 'success', 'Google Calendar 방송 일정 업데이트 완료', ?, ?)
              `
            )
              .bind(createId("sync"), data.id, googleCalendarEventId, new Date().toISOString())
              .run();
          } catch (e) {
            calendarSuccess = false;
            calendarErrorMsg = e instanceof Error ? e.message : "Calendar API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'calendar', 'update', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), data.id, `Google Calendar 방송 일정 업데이트 실패: ${calendarErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // Google Calendar 출고일정 동기화 수행
        if (hasShipmentCalendarTarget && accessToken) {
          try {
            if (data.shipmentDate) {
              const startDate = data.shipmentDate;
              const sDate = new Date(`${startDate}T00:00:00`);
              sDate.setDate(sDate.getDate() + 1);
              const endDate = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, "0")}-${String(sDate.getDate()).padStart(2, "0")}`;

              const [year, month, day] = data.saleDate.split("-");
              const formattedSaleDate = `${parseInt(month, 10)}/${parseInt(day, 10)}`;
              const shipmentTitle = `[${channelAlias}_${partnerAlias}] ${formattedSaleDate} ${data.productName}`;
              const shipmentDescription = `제품: ${data.productName}\n홈쇼핑: ${channelName}\n업체: ${partnerName}\n수량: ${data.quantity}`;

              if (googleCalendarShipmentEventId) {
                await updateGoogleCalendarEvent(accessToken, connection.shipment_calendar_id!, googleCalendarShipmentEventId, {
                  title: shipmentTitle,
                  description: shipmentDescription,
                  startDate,
                  endDate,
                });
              } else {
                googleCalendarShipmentEventId = await createGoogleCalendarEvent(accessToken, connection.shipment_calendar_id!, {
                  title: shipmentTitle,
                  description: shipmentDescription,
                  startDate,
                  endDate,
                });
              }

              await env.DB.prepare(
                `
                  INSERT INTO sync_logs (
                    id, schedule_id, target, operation, status, message, google_object_id, created_at
                  )
                  VALUES (?, ?, 'calendar', 'update', 'success', 'Google Calendar 출고 일정 업데이트 완료', ?, ?)
                `
              )
                .bind(createId("sync"), data.id, googleCalendarShipmentEventId, new Date().toISOString())
                .run();
            } else {
              // 출고일이 명시적으로 지워졌고, 이전에 생성한 출고 이벤트가 있다면 삭제!
              if (googleCalendarShipmentEventId) {
                await deleteGoogleCalendarEvent(accessToken, connection.shipment_calendar_id!, googleCalendarShipmentEventId);
                googleCalendarShipmentEventId = null;

                await env.DB.prepare(
                  `
                    INSERT INTO sync_logs (
                      id, schedule_id, target, operation, status, message, created_at
                    )
                    VALUES (?, ?, 'calendar', 'delete', 'success', '출고일 초기화로 인한 Google Calendar 출고 일정 삭제 완료', ?)
                  `
                )
                  .bind(createId("sync"), data.id, new Date().toISOString())
                  .run();
              }
            }
          } catch (e) {
            shipmentCalendarSuccess = false;
            shipmentCalendarErrorMsg = e instanceof Error ? e.message : "Calendar API 에러";
            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, created_at
                )
                VALUES (?, ?, 'calendar', 'update', 'failed', ?, ?)
              `
            )
              .bind(createId("sync"), data.id, `Google Calendar 출고 일정 업데이트/삭제 실패: ${shipmentCalendarErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // 동기화 상태 판정
        const activeTargetsCount = (hasSheetsTarget ? 1 : 0) + (hasCalendarTarget ? 1 : 0) + (hasShipmentCalendarTarget && (!!data.shipmentDate || !!oldSchedule.google_calendar_shipment_event_id) ? 1 : 0);
        const successTargetsCount = (hasSheetsTarget && sheetsSuccess ? 1 : 0) + (hasCalendarTarget && calendarSuccess ? 1 : 0) + (hasShipmentCalendarTarget && (!!data.shipmentDate || !!oldSchedule.google_calendar_shipment_event_id) && shipmentCalendarSuccess ? 1 : 0);

        if (successTargetsCount === activeTargetsCount) {
          syncStatus = "synced";
        } else {
          syncStatus = "sync_failed";
        }

      } catch (err) {
        syncStatus = "sync_failed";
        const errMsg = err instanceof Error ? err.message : "인증 실패";

        await env.DB.batch([
          env.DB.prepare(
            `INSERT INTO sync_logs (id, schedule_id, target, operation, status, message, created_at) VALUES (?, ?, 'sheets', 'update', 'failed', ?, ?)`
          ).bind(createId("sync"), data.id, `인증 및 연결 오류로 업데이트 실패: ${errMsg}`, new Date().toISOString()),
          env.DB.prepare(
            `INSERT INTO sync_logs (id, schedule_id, target, operation, status, message, created_at) VALUES (?, ?, 'calendar', 'update', 'failed', ?, ?)`
          ).bind(createId("sync"), data.id, `인증 및 연결 오류로 업데이트 실패: ${errMsg}`, new Date().toISOString()),
        ]);
      }
    } else {
      syncStatus = "not_synced";
    }

    // 최종 schedule의 sync_status 및 google ID 필드 업데이트
    await env.DB.prepare(
      `
        UPDATE schedules
        SET
          sync_status = ?,
          google_sheet_row_id = ?,
          google_calendar_event_id = ?,
          google_calendar_shipment_event_id = ?
        WHERE id = ? AND created_by = ?
      `
    )
      .bind(syncStatus, googleSheetRowId, googleCalendarEventId, googleCalendarShipmentEventId, data.id, sessionUser.id)
      .run();

    const row = await env.DB.prepare(`${scheduleViewSelect} WHERE schedules.id = ?`)
      .bind(data.id)
      .first<ScheduleViewRow>();

    return json({ data: row ? mapScheduleView(row) : null });
  } catch (error) {
    console.error("[SCHEDULE UPDATE ERROR]", error);
    return serverError(error);
  }
};


