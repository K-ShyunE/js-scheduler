import { createOAuthStateCookie } from "../../../_shared/auth";
import { getGoogleAuthUrl } from "../../../_shared/google";
import type { AppPagesFunction } from "../../../_shared/types";

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const state = crypto.randomUUID();
  const cookie = await createOAuthStateCookie(state, env, request);
  
  const requestUrl = new URL(request.url);
  const forceConsent = requestUrl.searchParams.get("force") === "true";
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;

  const headers = new Headers({
    location: getGoogleAuthUrl(env, state, redirectUri, forceConsent),
  });
  headers.append("set-cookie", cookie);

  return new Response(null, {
    status: 302,
    headers,
  });
};
