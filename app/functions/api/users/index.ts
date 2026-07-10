import { getSessionUser } from "../../_shared/auth";
import { SUPER_ADMIN_EMAILS } from "../../_shared/config";
import { badRequest, json, serverError } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

// Helper to check admin access
async function checkAdmin(request: Request, env: Env) {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) return null;
  const isAdmin = SUPER_ADMIN_EMAILS.includes(sessionUser.email.toLowerCase());
  return isAdmin ? sessionUser : null;
}

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const admin = await checkAdmin(request, env);
  if (!admin) {
    return json({ error: { message: "권한이 없습니다." } }, { status: 403 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT email, added_by, memo, created_at FROM allowed_users ORDER BY created_at DESC`
    ).all();

    return json({ data: results });
  } catch (error) {
    console.error("Failed to list allowed users:", error);
    return serverError("사용자 목록을 불러오지 못했습니다.");
  }
};

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const admin = await checkAdmin(request, env);
  if (!admin) {
    return json({ error: { message: "권한이 없습니다." } }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { email?: string; memo?: string };
    if (!body.email) return badRequest("이메일을 입력해주세요.");
    
    const email = body.email.trim().toLowerCase();
    const memo = body.memo?.trim() || "";

    await env.DB.prepare(
      `INSERT INTO allowed_users (email, added_by, memo) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET memo = excluded.memo`
    )
      .bind(email, admin.email, memo)
      .run();

    return json({ data: { email, memo } });
  } catch (error) {
    console.error("Failed to add allowed user:", error);
    return serverError("사용자 추가에 실패했습니다.");
  }
};
