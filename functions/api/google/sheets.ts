import { getSessionUser } from "../../_shared/auth";
import { decryptSecret } from "../../_shared/crypto";
import { fetchGoogleSheetsList, refreshGoogleAccessToken } from "../../_shared/google";
import { json } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  const connection = await env.DB.prepare(
    `SELECT encrypted_refresh_token FROM google_connections WHERE user_id = ?`
  )
    .bind(sessionUser.id)
    .first<{ encrypted_refresh_token: string }>();

  if (!connection) {
    return json({ error: { message: "구글 연동 정보가 없습니다." } }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const folderId = url.searchParams.get("folderId") || "root";

    const refreshToken = await decryptSecret(connection.encrypted_refresh_token, env);
    const tokenResult = await refreshGoogleAccessToken(env, refreshToken);
    const sheets = await fetchGoogleSheetsList(tokenResult.access_token, folderId);

    return json({ data: sheets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "구글 시트 목록 조회 실패";
    return json({ error: { message } }, { status: 500 });
  }
};
