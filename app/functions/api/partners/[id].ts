import { badRequest, json, serverError } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";
import { getSessionUser } from "../../_shared/auth";

export const onRequestDelete: AppPagesFunction = async ({ env, request, params }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const id = params.id as string;
    if (!id) {
      return badRequest("ID가 필요합니다.");
    }

    // Check if partner is used in schedules or products
    const { count } = await env.DB.prepare(
      `
      SELECT 
        (SELECT COUNT(*) FROM schedules WHERE partner_id = ?) + 
        (SELECT COUNT(*) FROM products WHERE partner_id = ?) AS count
      `
    )
      .bind(id, id)
      .first<{ count: number }>() || { count: 0 };

    if (count > 0) {
      // Soft Delete
      const now = new Date().toISOString();
      await env.DB.prepare(
        "UPDATE partners SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      )
        .bind(now, now, id, sessionUser.id)
        .run();
      
      return json({ message: "사용 중인 파트너이므로 숨김(Soft Delete) 처리되었습니다.", softDeleted: true });
    } else {
      // Hard Delete
      await env.DB.prepare(
        "DELETE FROM partners WHERE id = ? AND user_id = ?"
      )
        .bind(id, sessionUser.id)
        .run();

      return json({ message: "파트너가 영구 삭제되었습니다.", softDeleted: false });
    }
  } catch (error) {
    return serverError(error);
  }
};
