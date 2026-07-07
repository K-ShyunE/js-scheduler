import { createSessionCookie, isDevAuthAllowed } from "../../_shared/auth";
import { json } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  if (!isDevAuthAllowed(env)) {
    return json({ error: { message: "개발 로그인은 로컬 환경에서만 사용할 수 있습니다." } }, { status: 404 });
  }

  const user = {
    id: "dev_user",
    email: env.DEV_AUTH_EMAIL || "operator@example.com",
    name: env.DEV_AUTH_NAME || "운영 담당자",
  };
  const cookie = await createSessionCookie(user, env, request);

  return json(
    { data: user },
    {
      headers: {
        "set-cookie": cookie,
      },
    },
  );
};

