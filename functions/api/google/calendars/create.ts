import { getSessionUser } from "../../../_shared/auth";
import { decryptSecret } from "../../../_shared/crypto";
import { createGoogleCalendar, refreshGoogleAccessToken } from "../../../_shared/google";
import { json } from "../../../_shared/http";
import type { AppPagesFunction } from "../../../_shared/types";

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { summary } = (await request.json()) as { summary: string };
    if (!summary || !summary.trim()) {
      return json({ error: { message: "캘린더 이름이 올바르지 않습니다." } }, { status: 400 });
    }

    const connection = await env.DB.prepare(
      `SELECT id, encrypted_refresh_token FROM google_connections WHERE user_id = ?`
    )
      .bind(sessionUser.id)
      .first<{ id: string; encrypted_refresh_token: string }>();

    if (!connection) {
      return json({ error: { message: "구글 연동 정보가 없습니다." } }, { status: 400 });
    }

    const refreshToken = await decryptSecret(connection.encrypted_refresh_token, env);
    const tokenResult = await refreshGoogleAccessToken(env, refreshToken);
    const newCalendarId = await createGoogleCalendar(tokenResult.access_token, summary.trim());

    const now = new Date().toISOString();
    await env.DB.prepare(
      `
        UPDATE google_connections
        SET
          calendar_id = ?,
          updated_at = ?
        WHERE id = ?
      `
    )
      .bind(newCalendarId, now, connection.id)
      .run();

    return json({ data: { calendarId: newCalendarId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "신규 캘린더 생성 실패";
    return json({ error: { message } }, { status: 500 });
  }
};
