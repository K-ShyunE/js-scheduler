import {
  clearOAuthStateCookie,
  createSessionCookie,
  verifyOAuthState,
} from "../../../_shared/auth";
import { encryptSecret } from "../../../_shared/crypto";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  isAllowedEmail,
  createGoogleSpreadsheet,
  createGoogleCalendar,
} from "../../../_shared/google";
import { json } from "../../../_shared/http";
import { createId } from "../../../_shared/ids";
import type { AppPagesFunction } from "../../../_shared/types";

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appBaseUrl = env.APP_BASE_URL || new URL(request.url).origin;

  if (!code) {
    return redirectWithError(appBaseUrl, "Google 인증 코드가 없습니다.");
  }

  const isValidState = await verifyOAuthState(request, env, state);

  if (!isValidState) {
    return redirectWithError(appBaseUrl, "OAuth state 검증에 실패했습니다.");
  }

  try {
    const token = await exchangeGoogleCode(env, code);
    const googleUser = await fetchGoogleUserInfo(token.access_token!);

    if (!googleUser.email_verified || !isAllowedEmail(env, googleUser.email)) {
      return redirectWithError(appBaseUrl, "허용되지 않은 Google 계정입니다.");
    }

    const existingUser = await env.DB.prepare(`SELECT id FROM users WHERE email = ?`)
      .bind(googleUser.email)
      .first<{ id: string }>();
    const userId = existingUser?.id || createId("user");
    const now = new Date().toISOString();

    await env.DB.prepare(
      `
        INSERT INTO users (
          id, email, name, picture_url, google_sub, created_at, last_login_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
          name = excluded.name,
          picture_url = excluded.picture_url,
          google_sub = excluded.google_sub,
          last_login_at = excluded.last_login_at
      `,
    )
      .bind(userId, googleUser.email, googleUser.name, googleUser.picture || null, googleUser.sub, now, now)
      .run();

    if (token.refresh_token) {
      const encryptedRefreshToken = await encryptSecret(token.refresh_token, env);
      const expiresAt = token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString()
        : null;

      console.log("[GOOGLE CALLBACK DEBUG] Querying existing connection for user_id:", userId);
      const existingConnection = await env.DB.prepare(
        `SELECT id, spreadsheet_id, calendar_id FROM google_connections WHERE user_id = ?`
      )
        .bind(userId)
        .first<{ id: string; spreadsheet_id: string | null; calendar_id: string | null }>();

      console.log("[GOOGLE CALLBACK DEBUG] Query result existingConnection:", JSON.stringify(existingConnection));

      let spreadsheetId = existingConnection?.spreadsheet_id || null;
      let calendarId = existingConnection?.calendar_id || null;

      if (!spreadsheetId && token.access_token) {
        try {
          console.log("[GOOGLE CALLBACK DEBUG] Auto-creating default spreadsheet...");
          spreadsheetId = await createGoogleSpreadsheet(token.access_token, "홈쇼핑 일정 관리");
          console.log("[GOOGLE CALLBACK DEBUG] Automatically created spreadsheetId:", spreadsheetId);
        } catch (e) {
          console.error("[GOOGLE CALLBACK DEBUG] 스프레드시트 자동 생성 실패:", e);
        }
      }

      if (!calendarId && token.access_token) {
        try {
          console.log("[GOOGLE CALLBACK DEBUG] Auto-creating default calendar...");
          calendarId = await createGoogleCalendar(token.access_token, "홈쇼핑 일정 캘린더");
          console.log("[GOOGLE CALLBACK DEBUG] Automatically created calendarId:", calendarId);
        } catch (e) {
          console.error("[GOOGLE CALLBACK DEBUG] 캘린더 자동 생성 실패:", e);
        }
      }

      if (existingConnection) {
        console.log("[GOOGLE CALLBACK DEBUG] Updating connection record for existingConnection.id:", existingConnection.id);
        await env.DB.prepare(
          `
            UPDATE google_connections
            SET
              google_email = ?,
              encrypted_refresh_token = ?,
              scope = ?,
              spreadsheet_id = ?,
              calendar_id = ?,
              expires_at = ?,
              updated_at = ?
            WHERE id = ?
          `,
        )
          .bind(
            googleUser.email,
            encryptedRefreshToken,
            token.scope || "",
            spreadsheetId,
            calendarId,
            expiresAt,
            now,
            existingConnection.id,
          )
          .run();
        console.log("[GOOGLE CALLBACK DEBUG] Connection record updated.");
      } else {
        console.log("[GOOGLE CALLBACK DEBUG] Inserting new connection record...");
        await env.DB.prepare(
          `
            INSERT INTO google_connections (
              id,
              user_id,
              google_email,
              encrypted_refresh_token,
              scope,
              spreadsheet_id,
              calendar_id,
              expires_at,
              created_at,
              updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        )
          .bind(
            createId("google_connection"),
            userId,
            googleUser.email,
            encryptedRefreshToken,
            token.scope || "",
            spreadsheetId,
            calendarId,
            expiresAt,
            now,
            now,
          )
          .run();
        console.log("[GOOGLE CALLBACK DEBUG] New connection record inserted.");
      }
    }

    const sessionCookie = await createSessionCookie(
      {
        id: userId,
        email: googleUser.email,
        name: googleUser.name,
      },
      env,
      request,
    );

    const headers = new Headers({
      location: appBaseUrl,
    });
    headers.append("set-cookie", sessionCookie);
    headers.append("set-cookie", clearOAuthStateCookie());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google OAuth 처리에 실패했습니다.";

    return redirectWithError(appBaseUrl, message);
  }
};

function redirectWithError(appBaseUrl: string, message: string) {
  const url = new URL(appBaseUrl);
  url.searchParams.set("auth_error", message);
  const headers = new Headers({
    location: url.toString(),
  });
  headers.append("set-cookie", clearOAuthStateCookie());

  return new Response(null, {
    status: 302,
    headers,
  });
}

export const onRequestPost: AppPagesFunction = async () =>
  json({ error: { message: "지원하지 않는 메서드입니다." } }, { status: 405 });
