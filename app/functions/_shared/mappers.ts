import type {
  ChannelRow,
  PartnerRow,
  ScheduleViewRow,
} from "./types";

export function mapPartner(row: PartnerRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    contactName: row.contact_name ?? undefined,
    contactPhone: row.contact_phone ?? undefined,
    memo: row.memo ?? undefined,
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
  };
}

export function mapChannel(row: ChannelRow) {
  return {
    id: row.id,
    name: row.name,
    alias: row.alias ?? undefined,
    type: row.type,
    isActive: row.is_active === 1,
    displayOrder: row.display_order,
  };
}

export function mapScheduleView(row: ScheduleViewRow) {
  return {
    id: row.id,
    productId: row.product_id,
    partnerId: row.partner_id,
    channelId: row.channel_id,
    saleDate: row.sale_date,
    saleStartTime: row.sale_start_time,
    saleEndTime: row.sale_end_time,
    shipmentDate: row.shipment_date,
    quantity: row.quantity,
    status: row.status,
    syncStatus: row.sync_status,
    memo: row.memo ?? undefined,
    googleSheetRowId: row.google_sheet_row_id ?? undefined,
    googleCalendarEventId: row.google_calendar_event_id ?? undefined,
    googleCalendarShipmentEventId: row.google_calendar_shipment_event_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    product: {
      id: row.product_id,
      name: row.product_name,
      brandName: row.product_brand_name,
      modelName: row.product_model_name ?? undefined,
      partnerId: row.partner_id,
    },
    partner: {
      id: row.partner_id,
      name: row.partner_name,
      type: row.partner_type,
      contactName: row.partner_contact_name ?? undefined,
      contactPhone: row.partner_contact_phone ?? undefined,
    },
    channel: {
      id: row.channel_id,
      name: row.channel_name,
      alias: row.channel_alias ?? undefined,
      type: row.channel_type,
      isActive: row.channel_is_active === 1,
      displayOrder: row.channel_display_order,
    },
  };
}

