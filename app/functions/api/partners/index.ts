import { badRequest, json, readJson, serverError } from "../../_shared/http";
import { createId } from "../../_shared/ids";
import { mapPartner } from "../../_shared/mappers";
import type { AppPagesFunction, PartnerRow } from "../../_shared/types";
import { getSessionUser } from "../../_shared/auth";

interface PartnerCreateInput {
  name?: string;
  type?: PartnerRow["type"];
  contactName?: string;
  contactPhone?: string;
  memo?: string;
}

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM partners WHERE user_id = ? ORDER BY display_order ASC, name ASC`,
    )
      .bind(sessionUser.id)
      .all<PartnerRow>();

    return json({ data: results.map(mapPartner) });
  } catch (error) {
    return serverError(error);
  }
};

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const input = await readJson<PartnerCreateInput>(request);
    const name = input.name?.trim();
    const type = input.type ?? "supplier";

    if (!name) {
      return badRequest("업체명을 입력해주세요.");
    }

    const maxOrder = await env.DB.prepare(
      `SELECT COALESCE(MAX(display_order), 0) AS value FROM partners WHERE user_id = ?`,
    )
      .bind(sessionUser.id)
      .first<{ value: number }>();

    const now = new Date().toISOString();
    const id = createId("partner");

    await env.DB.prepare(
      `
        INSERT INTO partners (
          id, name, type, contact_name, contact_phone, memo, is_active, display_order, user_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        name,
        type,
        input.contactName?.trim() || null,
        input.contactPhone?.trim() || null,
        input.memo?.trim() || null,
        1,
        (maxOrder?.value ?? 0) + 1,
        sessionUser.id,
        now,
        now,
      )
      .run();

    const row = await env.DB.prepare(`SELECT * FROM partners WHERE id = ? AND user_id = ?`)
      .bind(id, sessionUser.id)
      .first<PartnerRow>();

    return json({ data: row ? mapPartner(row) : null }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
};

export const onRequestPut: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const input = await readJson<{
      id: string;
      name?: string;
      contactName?: string;
      isActive?: boolean;
      displayOrder?: number;
      deletedAt?: null;
    }>(request);

    if (!input.id) {
      return badRequest("ID가 필요합니다.");
    }

    const now = new Date().toISOString();

    const existing = await env.DB.prepare("SELECT * FROM partners WHERE id = ? AND user_id = ?")
      .bind(input.id, sessionUser.id)
      .first<PartnerRow>();

    if (!existing) {
      return badRequest("존재하지 않는 파트너입니다.");
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const contactName = input.contactName !== undefined ? (input.contactName.trim() || null) : existing.contact_name;
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active;
    const displayOrder = input.displayOrder !== undefined ? input.displayOrder : existing.display_order;
    const deletedAt = input.deletedAt === null ? null : existing.deleted_at;

    await env.DB.prepare(
      `
        UPDATE partners
        SET name = ?, contact_name = ?, is_active = ?, display_order = ?, deleted_at = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
    )
      .bind(name, contactName, isActive, displayOrder, deletedAt, now, input.id, sessionUser.id)
      .run();

    const updated = await env.DB.prepare("SELECT * FROM partners WHERE id = ? AND user_id = ?")
      .bind(input.id, sessionUser.id)
      .first<PartnerRow>();

    return json({ data: updated ? mapPartner(updated) : null });
  } catch (error) {
    return serverError(error);
  }
};
