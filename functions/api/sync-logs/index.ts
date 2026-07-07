import { json, serverError } from "../../_shared/http";
import type { AppPagesFunction } from "../../_shared/types";

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

export const onRequestGet: AppPagesFunction = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 50`,
    ).all<SyncLogRow>();

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

