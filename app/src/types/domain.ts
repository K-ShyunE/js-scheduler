export type ScheduleStatus =
  | "draft"
  | "scheduled"
  | "sold"
  | "shipping_ready"
  | "shipped"
  | "cancelled";

export type SyncStatus =
  | "not_synced"
  | "synced"
  | "sync_failed"
  | "sync_pending";

export type PartnerType = "supplier" | "brand" | "logistics" | "agency";

export type ChannelType = "home_shopping" | "live_commerce" | "online";

export interface User {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
  googleEmail?: string | null;
  spreadsheetId?: string | null;
  calendarId?: string | null;
  shipmentCalendarId?: string | null;
  role?: "admin" | "user";
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  contactName?: string;
  contactPhone?: string;
  memo?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface Channel {
  id: string;
  name: string;
  alias?: string;
  type: ChannelType;
  isActive: boolean;
  displayOrder: number;
}

export interface Product {
  id: string;
  name: string;
  brandName: string;
  modelName?: string;
  partnerId: string;
  memo?: string;
}

export interface Schedule {
  id: string;
  productId: string;
  partnerId: string;
  channelId: string;
  saleDate: string;
  saleStartTime: string;
  saleEndTime: string;
  shipmentDate: string;
  quantity: number;
  status: ScheduleStatus;
  syncStatus: SyncStatus;
  memo?: string;
  googleSheetRowId?: string;
  googleCalendarEventId?: string;
  googleCalendarShipmentEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleView extends Schedule {
  product: Product;
  partner: Partner;
  channel: Channel;
}

export interface SyncLog {
  id: string;
  scheduleId: string;
  target: "sheets" | "calendar";
  operation: "create" | "update" | "delete" | "retry";
  status: "success" | "failed" | "pending";
  message: string;
  createdAt: string;
}

export interface ScheduleDraft {
  productName: string;
  brandName: string;
  partnerId: string;
  channelId: string;
  saleDate: string;
  saleStartTime: string;
  saleEndTime: string;
  shipmentDate: string;
  quantity: number;
  memo?: string;
  skipSync?: boolean;
}

