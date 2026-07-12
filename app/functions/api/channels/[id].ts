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

    // Check if channel is used in schedules
    const { count } = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM schedules WHERE channel_id = ?"
    )
      .bind(id)
      .first<{ count: number }>() || { count: 0 };

    if (count > 0) {
      // Soft Delete
      const now = new Date().toISOString();
      await env.DB.prepare(
        "UPDATE channels SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?"
      )
        .bind(now, now, id, sessionUser.id)
        .run();
      
      return json({ data: { message: "사용 중인 채널이므로 숨김(Soft Delete) 처리되었습니다.", softDeleted: true } });
    } else {
      // Hard Delete
      await env.DB.prepare(
        "DELETE FROM channels WHERE id = ? AND user_id = ?"
      )
        .bind(id, sessionUser.id)
        .run();

      return json({ data: { message: "채널이 영구 삭제되었습니다.", softDeleted: false } });
    }
  } catch (error) {
    return serverError(error);
  }
};
