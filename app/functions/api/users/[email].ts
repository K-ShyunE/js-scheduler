import { getSessionUser } from "../../_shared/auth";
import { SUPER_ADMIN_EMAILS } from "../../_shared/config";
import { json, serverError } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

// Helper to check admin access
async function checkAdmin(request: Request, env: Env) {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) return null;
  const isAdmin = SUPER_ADMIN_EMAILS.includes(sessionUser.email.toLowerCase());
  return isAdmin ? sessionUser : null;
}

export const onRequestDelete: AppPagesFunction = async ({ env, request, params }) => {
  const admin = await checkAdmin(request, env);
  if (!admin) {
    return json({ error: { message: "권한이 없습니다." } }, { status: 403 });
  }

  try {
    const emailToDelete = decodeURIComponent((params.email as string) || "").trim().toLowerCase();
    
    if (!emailToDelete) {
      return json({ error: { message: "삭제할 이메일이 지정되지 않았습니다." } }, { status: 400 });
    }

    if (SUPER_ADMIN_EMAILS.includes(emailToDelete)) {
      return json({ error: { message: "슈퍼 관리자는 삭제할 수 없습니다." } }, { status: 400 });
    }

    await env.DB.prepare(`DELETE FROM allowed_users WHERE email = ?`)
      .bind(emailToDelete)
      .run();

    return json({ data: { success: true } });
  } catch (error) {
    console.error("Failed to delete allowed user:", error);
    return serverError("사용자 삭제에 실패했습니다.");
  }
};
