import { getSessionUser } from "../../../_shared/auth";
import { decryptSecret } from "../../../_shared/crypto";
import { createGoogleSpreadsheet, refreshGoogleAccessToken } from "../../../_shared/google";
import { json } from "../../../_shared/http";
import type { AppPagesFunction } from "../../../_shared/types";

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { title } = (await request.json()) as { title: string };
    if (!title || !title.trim()) {
      return json({ error: { message: "시트 이름이 올바르지 않습니다." } }, { status: 400 });
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
    const newSheetId = await createGoogleSpreadsheet(tokenResult.access_token, title.trim());

    const now = new Date().toISOString();
    await env.DB.prepare(
      `
        UPDATE google_connections
        SET
          spreadsheet_id = ?,
          updated_at = ?
        WHERE id = ?
      `
    )
      .bind(newSheetId, now, connection.id)
      .run();

    return json({ data: { spreadsheetId: newSheetId } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "신규 시트 생성 실패";
    return json({ error: { message } }, { status: 500 });
  }
};
