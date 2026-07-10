export const scheduleViewSelect = `
  SELECT
    schedules.id,
    schedules.product_id,
    schedules.partner_id,
    schedules.channel_id,
    schedules.sale_date,
    schedules.sale_start_time,
    schedules.sale_end_time,
    schedules.shipment_date,
    schedules.quantity,
    schedules.status,
    schedules.memo,
    schedules.google_sheet_row_id,
    schedules.google_calendar_event_id,
    schedules.google_calendar_shipment_event_id,
    schedules.sync_status,
    schedules.created_at,
    schedules.updated_at,
    products.name AS product_name,
    products.brand_name AS product_brand_name,
    products.model_name AS product_model_name,
    partners.name AS partner_name,
    partners.type AS partner_type,
    partners.contact_name AS partner_contact_name,
    partners.contact_phone AS partner_contact_phone,
    channels.name AS channel_name,
    channels.alias AS channel_alias,
    channels.type AS channel_type,
    channels.is_active AS channel_is_active,
    channels.display_order AS channel_display_order
  FROM schedules
  JOIN products ON products.id = schedules.product_id
  JOIN partners ON partners.id = schedules.partner_id
  JOIN channels ON channels.id = schedules.channel_id
`;

