import { createOAuthStateCookie } from "../../../_shared/auth";
import { getGoogleAuthUrl } from "../../../_shared/google";
import type { AppPagesFunction } from "../../../_shared/types";

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const state = crypto.randomUUID();
  const cookie = await createOAuthStateCookie(state, env, request);
  const headers = new Headers({
    location: getGoogleAuthUrl(env, state),
  });
  headers.append("set-cookie", cookie);

  return new Response(null, {
    status: 302,
    headers,
  });
};
