import type { PagesFunction } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  SESSION_SECRET?: string;
  DEV_AUTH_ENABLED?: string;
  DEV_AUTH_EMAIL?: string;
  DEV_AUTH_NAME?: string;
  CF_PAGES_BRANCH?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REDIRECT_URI?: string;
  ALLOWED_EMAILS?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  APP_BASE_URL?: string;
}

export type AppPagesFunction = PagesFunction<Env>;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  exp: number;
}

export interface GoogleConnectionRow {
  id: string;
  user_id: string;
  google_email: string;
  encrypted_refresh_token: string;
  scope: string;
  spreadsheet_id: string | null;
  calendar_id: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PartnerRow {
  id: string;
  name: string;
  type: "supplier" | "brand" | "logistics" | "agency";
  contact_name: string | null;
  contact_phone: string | null;
  memo: string | null;
  is_active: number;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChannelRow {
  id: string;
  name: string;
  alias: string | null;
  type: "home_shopping" | "live_commerce" | "online";
  is_active: number;
  display_order: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleViewRow {
  id: string;
  product_id: string;
  partner_id: string;
  channel_id: string;
  sale_date: string;
  sale_start_time: string;
  sale_end_time: string;
  shipment_date: string;
  quantity: number;
  status: "draft" | "scheduled" | "sold" | "shipping_ready" | "shipped" | "cancelled";
  memo: string | null;
  google_sheet_row_id: string | null;
  google_calendar_event_id: string | null;
  google_calendar_shipment_event_id: string | null;
  sync_status: "not_synced" | "synced" | "sync_failed" | "sync_pending";
  created_at: string;
  updated_at: string;
  product_name: string;
  product_brand_name: string;
  product_model_name: string | null;
  partner_name: string;
  partner_type: "supplier" | "brand" | "logistics" | "agency";
  partner_contact_name: string | null;
  partner_contact_phone: string | null;
  channel_name: string;
  channel_alias: string | null;
  channel_type: "home_shopping" | "live_commerce" | "online";
  channel_is_active: number;
  channel_display_order: number;
}
