import { clearSessionCookie } from "../../_shared/auth";
import { json } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

export const onRequestPost: AppPagesFunction = async () => {
  return json(
    { data: { ok: true } },
    {
      headers: {
        "set-cookie": clearSessionCookie(),
      },
    },
  );
};

