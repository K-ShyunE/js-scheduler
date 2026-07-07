import { getSessionUser } from "./_shared/auth";
import { json } from "./_shared/http";
import type { AppPagesFunction } from "./_shared/types";

export const onRequest: AppPagesFunction = async ({ env, next, request }) => {
  const { pathname } = new URL(request.url);

  if (!pathname.startsWith("/api/")) {
    return next();
  }

  if (pathname === "/api/session" || pathname.startsWith("/api/auth/")) {
    return next();
  }

  const sessionUser = await getSessionUser(request, env);

  if (!sessionUser) {
    // 가장 중요한 보호선이다. 이 응답 이후에는 D1이나 Google API에 접근하지 않는다.
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  return next();
};

