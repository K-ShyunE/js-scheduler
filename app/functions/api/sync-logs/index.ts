import { json, serverError } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";
import { getSessionUser } from "../../_shared/auth";

interface SyncLogRow {
  id: string;
  schedule_id: string;
  target: "sheets" | "calendar";
  operation: "create" | "update" | "delete" | "retry";
  status: "success" | "failed" | "pending";
  message: string;
  google_object_id: string | null;
  created_at: string;
}

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { results } = await env.DB.prepare(
      `
        SELECT sync_logs.*
        FROM sync_logs
        JOIN schedules ON sync_logs.schedule_id = schedules.id
        WHERE schedules.created_by = ?
        ORDER BY sync_logs.created_at DESC
        LIMIT 50
      `,
    )
      .bind(sessionUser.id)
      .all<SyncLogRow>();

    return json({
      data: results.map((row) => ({
        id: row.id,
        scheduleId: row.schedule_id,
        target: row.target,
        operation: row.operation,
        status: row.status,
        message: row.message,
        googleObjectId: row.google_object_id ?? undefined,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
};
