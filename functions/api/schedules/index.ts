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
  createGoogleCalendarEvent,
} from "../../_shared/google";

const scheduleCreateSchema = z.object({
  productName: z.string().min(1),
  brandName: z.string().min(1),
  partnerId: z.string().min(1),
  channelId: z.string().min(1),
  saleDate: z.string().min(1),
  saleStartTime: z.string().min(1),
  saleEndTime: z.string().min(1),
  shipmentDate: z.string().min(1),
  quantity: z.coerce.number().int().nonnegative(),
  memo: z.string().optional(),
});

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim().toLowerCase();

    const baseSql = `
      ${scheduleViewSelect}
      ${
        query
          ? `
              WHERE
                LOWER(products.name) LIKE ?
                OR LOWER(products.brand_name) LIKE ?
                OR LOWER(partners.name) LIKE ?
                OR LOWER(channels.name) LIKE ?
                OR LOWER(COALESCE(schedules.memo, '')) LIKE ?
            `
          : ""
      }
      ORDER BY schedules.sale_date ASC, schedules.sale_start_time ASC
    `;

    const statement = env.DB.prepare(baseSql);
    const wildcard = `%${query ?? ""}%`;
    const { results } = query
      ? await statement
          .bind(wildcard, wildcard, wildcard, wildcard, wildcard)
          .all<ScheduleViewRow>()
      : await statement.all<ScheduleViewRow>();

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

    // 1. D1 DB에 기본정보 삽입 (batch 트랜잭션)
    await env.DB.batch([
      env.DB.prepare(
        `
          INSERT INTO products (
            id, name, brand_name, partner_id, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      ).bind(productId, data.productName, data.brandName, data.partnerId, now, now),
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
        data.saleEndTime,
        data.shipmentDate,
        data.quantity,
        data.memo?.trim() || null,
        sessionUser.id,
        now,
        now,
      ),
    ]);

    // 파트너 이름과 채널 이름을 구글 전송 데이터용으로 조회
    const partnerName = await env.DB.prepare("SELECT name FROM partners WHERE id = ?")
      .bind(data.partnerId)
      .first<string>("name");
    const channelName = await env.DB.prepare("SELECT name FROM channels WHERE id = ?")
      .bind(data.channelId)
      .first<string>("name");

    // 2. Google OAuth 연동 설정 조회
    const connection = await env.DB.prepare(
      `SELECT encrypted_refresh_token, spreadsheet_id, calendar_id FROM google_connections WHERE user_id = ?`
    )
      .bind(sessionUser.id)
      .first<{ encrypted_refresh_token: string; spreadsheet_id: string | null; calendar_id: string | null }>();

    let syncStatus: "not_synced" | "synced" | "sync_failed" | "sync_pending" = "not_synced";
    let googleSheetRowId: string | null = null;
    let googleCalendarEventId: string | null = null;

    const hasSheetsTarget = !!connection?.spreadsheet_id;
    const hasCalendarTarget = !!connection?.calendar_id;

    if (connection && (hasSheetsTarget || hasCalendarTarget)) {
      try {
        const decryptedRefreshToken = await decryptSecret(connection.encrypted_refresh_token, env);
        const tokenResult = await refreshGoogleAccessToken(env, decryptedRefreshToken);
        const accessToken = tokenResult.access_token;

        let sheetsSuccess = true;
        let calendarSuccess = true;
        let sheetsErrorMsg = "";
        let calendarErrorMsg = "";

        // Google Sheets 동기화 수행
        if (hasSheetsTarget && accessToken) {
          try {
            googleSheetRowId = await writeGoogleSheetRow(accessToken, connection.spreadsheet_id!, {
              id: scheduleId,
              saleDate: data.saleDate,
              saleTime: `${data.saleStartTime} - ${data.saleEndTime}`,
              productName: data.productName,
              brandName: data.brandName,
              channelName: channelName || "미지정",
              shipmentDate: data.shipmentDate,
              quantity: data.quantity,
              memo: data.memo || "",
            });

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

        // Google Calendar 동기화 수행
        if (hasCalendarTarget && accessToken) {
          try {
            const startDateTime = `${data.saleDate}T${data.saleStartTime}:00`;
            const endDateTime = `${data.saleDate}T${data.saleEndTime}:00`;

            googleCalendarEventId = await createGoogleCalendarEvent(accessToken, connection.calendar_id!, {
              title: `[${channelName || "방송"}] ${data.productName}`,
              description: `브랜드: ${data.brandName}\n공급업체: ${partnerName || "미지정"}\n출고예정일: ${data.shipmentDate}\n수량: ${data.quantity}개\n메모: ${data.memo || ""}`,
              startDateTime,
              endDateTime,
            });

            await env.DB.prepare(
              `
                INSERT INTO sync_logs (
                  id, schedule_id, target, operation, status, message, google_object_id, created_at
                )
                VALUES (?, ?, 'calendar', 'create', 'success', 'Google Calendar 일정 생성 완료', ?, ?)
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
              .bind(createId("sync"), scheduleId, `Google Calendar 일정 생성 실패: ${calendarErrorMsg}`, new Date().toISOString())
              .run();
          }
        }

        // 동기화 상태 판정
        const activeTargetsCount = (hasSheetsTarget ? 1 : 0) + (hasCalendarTarget ? 1 : 0);
        const successTargetsCount = (hasSheetsTarget && sheetsSuccess ? 1 : 0) + (hasCalendarTarget && calendarSuccess ? 1 : 0);

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
          google_calendar_event_id = ?
        WHERE id = ?
      `
    )
      .bind(syncStatus, googleSheetRowId, googleCalendarEventId, scheduleId)
      .run();

    const row = await env.DB.prepare(`${scheduleViewSelect} WHERE schedules.id = ?`)
      .bind(scheduleId)
      .first<ScheduleViewRow>();

    return json({ data: row ? mapScheduleView(row) : null }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
};


