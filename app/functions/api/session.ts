import { getSessionUser } from "../_shared/auth";
import { SUPER_ADMIN_EMAILS } from "../_shared/config";
import { json } from "../_shared/http";
import type { AppPagesFunction } from "../_shared/types";

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);

  console.log("[SESSION API DEBUG] Session User from cookie:", JSON.stringify(sessionUser));

  if (!sessionUser) {
    console.log("[SESSION API DEBUG] No active session found.");
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  const connection = await env.DB.prepare(
    `SELECT google_email, spreadsheet_id, calendar_id, shipment_calendar_id FROM google_connections WHERE user_id = ?`
  )
    .bind(sessionUser.id)
    .first<{ google_email: string; spreadsheet_id: string | null; calendar_id: string | null; shipment_calendar_id: string | null }>();

  console.log("[SESSION API DEBUG] Google connections from DB:", JSON.stringify(connection));

  const role = SUPER_ADMIN_EMAILS.includes(sessionUser.email.toLowerCase()) ? "admin" : "user";

  const responsePayload = {
    data: {
      ...sessionUser,
      role,
      googleEmail: connection?.google_email || null,
      spreadsheetId: connection?.spreadsheet_id || null,
      calendarId: connection?.calendar_id || null,
      shipmentCalendarId: connection?.shipment_calendar_id || null,
    },
  };

  console.log("[SESSION API DEBUG] Returning session payload:", JSON.stringify(responsePayload));

  return json(responsePayload);
};

