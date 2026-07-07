import type { Env } from "./types";

const oauthScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/calendar.events",
];

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture?: string;
}

export function getGoogleAuthUrl(env: Env, state: string, redirectUri: string) {
  assertGoogleEnv(env);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", oauthScopes.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}

export async function exchangeGoogleCode(env: Env, code: string, redirectUri: string) {
  assertGoogleEnv(env);

  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google token 교환에 실패했습니다.");
  }

  return payload;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Google 사용자 정보를 가져오지 못했습니다.");
  }

  return response.json() as Promise<GoogleUserInfo>;
}

export function isAllowedEmail(env: Env, email: string) {
  const allowedEmails = (env.ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allowedEmails.length === 0) {
    return true; // 허용 이메일 설정이 없으면 모두 가입/로그인 허용
  }

  return allowedEmails.includes(email.toLowerCase());
}

function assertGoogleEnv(env: Env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth 환경 변수가 설정되지 않았습니다.");
  }
}

export async function refreshGoogleAccessToken(env: Env, refreshToken: string) {
  assertGoogleEnv(env);

  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    client_secret: env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || payload.error || "Google token 갱신에 실패했습니다.");
  }

  return payload;
}

export async function fetchGoogleSheetsList(accessToken: string, folderId: string = "root") {
  const q = `'${folderId}' in parents and (mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.spreadsheet') and trashed=false`;
  const query = encodeURIComponent(q);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)&pageSize=100`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("드라이브 목록을 가져오지 못했습니다.");
  }

  const payload = (await response.json()) as { files?: { id: string; name: string; mimeType: string }[] };
  return payload.files || [];
}

export async function fetchGoogleCalendarsList(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("캘린더 목록을 가져오지 못했습니다.");
  }

  const payload = (await response.json()) as { items?: { id: string; summary: string; backgroundColor?: string }[] };
  return (payload.items || []).map((item) => ({
    id: item.id,
    summary: item.summary,
    backgroundColor: item.backgroundColor || "#4285F4",
  }));
}

export async function createGoogleSpreadsheet(accessToken: string, title: string) {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
    }),
  });

  if (!response.ok) {
    throw new Error("새로운 스프레드시트를 생성하지 못했습니다.");
  }

  const payload = (await response.json()) as { spreadsheetId: string };
  return payload.spreadsheetId;
}

export async function createGoogleCalendar(accessToken: string, summary: string) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ summary }),
  });

  if (!response.ok) {
    throw new Error("새로운 캘린더를 생성하지 못했습니다.");
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}

export async function writeGoogleSheetRow(
  accessToken: string,
  spreadsheetId: string,
  data: {
    id: string;
    saleDate: string;
    saleTime: string;
    productName: string;
    brandName: string;
    channelName: string;
    shipmentDate: string;
    quantity: number;
    memo: string;
  }
) {
  const range = "A:I"; // 첫 번째 시트의 맨 아래에 이어 쓰기
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const values = [
    [
      data.id,
      data.saleDate,
      data.saleTime,
      data.productName,
      data.brandName,
      data.channelName,
      data.shipmentDate,
      data.quantity,
      data.memo,
    ],
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Sheets 쓰기 실패: ${response.statusText}. ${errText}`);
  }

  const payload = (await response.json()) as { updates?: { updatedRange?: string } };
  return payload.updates?.updatedRange || "SheetUpdated";
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  calendarId: string,
  data: {
    title: string;
    description: string;
    startDateTime: string;
    endDateTime: string;
  }
) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      summary: data.title,
      description: data.description,
      start: {
        dateTime: data.startDateTime,
        timeZone: "Asia/Seoul",
      },
      end: {
        dateTime: data.endDateTime,
        timeZone: "Asia/Seoul",
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar 이벤트 생성 실패: ${response.statusText}. ${errText}`);
  }

  const payload = (await response.json()) as { id: string };
  return payload.id;
}



