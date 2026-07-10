import { getSessionUser } from "../../_shared/auth";
import { json } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { spreadsheetId, calendarId, shipmentCalendarId } = (await request.json()) as {
      spreadsheetId?: string | null;
      calendarId?: string | null;
      shipmentCalendarId?: string | null;
    };

    const connection = await env.DB.prepare(
      `SELECT id FROM google_connections WHERE user_id = ?`
    )
      .bind(sessionUser.id)
      .first<{ id: string }>();

    if (!connection) {
      return json({ error: { message: "구글 연동 정보가 존재하지 않습니다." } }, { status: 400 });
    }

    const now = new Date().toISOString();
    await env.DB.prepare(
      `
        UPDATE google_connections
        SET
          spreadsheet_id = ?,
          calendar_id = ?,
          shipment_calendar_id = ?,
          updated_at = ?
        WHERE id = ?
      `
    )
      .bind(
        spreadsheetId !== undefined ? spreadsheetId : null,
        calendarId !== undefined ? calendarId : null,
        shipmentCalendarId !== undefined ? shipmentCalendarId : null,
        now,
        connection.id
      )
      .run();

    return json({ data: { success: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구글 연동 설정 저장 실패";
    return json({ error: { message } }, { status: 500 });
  }
};
