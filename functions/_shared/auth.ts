import type { Env, SessionUser } from "./types";

const cookieName = "ls_session";
const oauthStateCookieName = "ls_oauth_state";
const sessionMaxAgeSeconds = 60 * 60 * 8;
const oauthStateMaxAgeSeconds = 60 * 10;

export async function createSessionCookie(user: Omit<SessionUser, "exp">, env: Env, request: Request) {
  const exp = Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;
  const payload: SessionUser = { ...user, exp };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(encodedPayload, getSessionSecret(env));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";

  return `${cookieName}=${encodedPayload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}${secure}`;
}

export function clearSessionCookie() {
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function createOAuthStateCookie(state: string, env: Env, request: Request) {
  const encodedState = base64UrlEncode(state);
  const signature = await sign(encodedState, getSessionSecret(env));
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";

  return `${oauthStateCookieName}=${encodedState}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${oauthStateMaxAgeSeconds}${secure}`;
}

export function clearOAuthStateCookie() {
  return `${oauthStateCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function verifyOAuthState(request: Request, env: Env, state: string | null) {
  if (!state) {
    return false;
  }

  const cookie = request.headers.get("cookie");
  const token = readCookie(cookie, oauthStateCookieName);

  if (!token) {
    return false;
  }

  const [encodedState, signature] = token.split(".");

  if (!encodedState || !signature) {
    return false;
  }

  const expectedSignature = await sign(encodedState, getSessionSecret(env));

  if (!constantTimeEqual(signature, expectedSignature)) {
    return false;
  }

  return constantTimeEqual(base64UrlDecode(encodedState), state);
}

export async function getSessionUser(request: Request, env: Env): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie");
  const token = readCookie(cookie, cookieName);

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await sign(encodedPayload, getSessionSecret(env));

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionUser;

    if (!payload.email || !payload.name || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function isDevAuthAllowed(env: Env) {
  return env.DEV_AUTH_ENABLED === "true" || env.CF_PAGES_BRANCH === "local";
}

function getSessionSecret(env: Env) {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  if (env.CF_PAGES_BRANCH === "local") {
    return "local-development-session-secret";
  }

  // 프로덕션에서 SESSION_SECRET이 빠지면 기존 세션을 모두 무효화한다.
  // Phase 5에서 Cloudflare Secret 등록 여부를 배포 체크리스트에 넣는다.
  return crypto.randomUUID();
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));

  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const target = cookies.find((cookie) => cookie.startsWith(`${name}=`));

  return target ? target.slice(name.length + 1) : null;
}

function base64UrlEncode(value: string) {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}
