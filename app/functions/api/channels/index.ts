import { badRequest, json, readJson, serverError } from "../../_shared/http";
import { createId } from "../../_shared/ids";
import { mapChannel } from "../../_shared/mappers";
import type { AppPagesFunction, ChannelRow } from "../../_shared/types";
import { getSessionUser } from "../../_shared/auth";

interface ChannelCreateInput {
  name?: string;
  alias?: string;
  type?: ChannelRow["type"];
  isActive?: boolean;
}

export const onRequestGet: AppPagesFunction = async ({ env, request }) => {
  const sessionUser = await getSessionUser(request, env);
  if (!sessionUser) {
    return json({ error: { message: "로그인이 필요합니다." } }, { status: 401 });
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM channels WHERE user_id = ? ORDER BY display_order ASC, name ASC`,
    )
      .bind(sessionUser.id)
      .all<ChannelRow>();

    return json({ data: results.map(mapChannel) });
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
    const input = await readJson<ChannelCreateInput>(request);
    const name = input.name?.trim();

    if (!name) {
      return badRequest("채널명을 입력해주세요.");
    }

    const maxOrder = await env.DB.prepare(
      `SELECT COALESCE(MAX(display_order), 0) AS value FROM channels WHERE user_id = ?`,
    )
      .bind(sessionUser.id)
      .first<{ value: number }>();

    const now = new Date().toISOString();
    const id = createId("channel");

    await env.DB.prepare(
      `
        INSERT INTO channels (
          id, name, alias, type, is_active, display_order, user_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        name,
        input.alias?.trim() || null,
        input.type ?? "home_shopping",
        input.isActive === false ? 0 : 1,
        (maxOrder?.value ?? 0) + 1,
        sessionUser.id,
        now,
        now,
      )
      .run();

    const row = await env.DB.prepare(`SELECT * FROM channels WHERE id = ? AND user_id = ?`)
      .bind(id, sessionUser.id)
      .first<ChannelRow>();

    return json({ data: row ? mapChannel(row) : null }, { status: 201 });
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
      alias?: string;
      isActive?: boolean;
      displayOrder?: number;
    }>(request);

    if (!input.id) {
      return badRequest("ID가 필요합니다.");
    }

    const now = new Date().toISOString();

    const existing = await env.DB.prepare("SELECT * FROM channels WHERE id = ? AND user_id = ?")
      .bind(input.id, sessionUser.id)
      .first<ChannelRow>();

    if (!existing) {
      return badRequest("존재하지 않는 채널입니다.");
    }

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const alias = input.alias !== undefined ? (input.alias.trim() || null) : existing.alias;
    const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active;
    const displayOrder = input.displayOrder !== undefined ? input.displayOrder : existing.display_order;

    await env.DB.prepare(
      `
        UPDATE channels
        SET name = ?, alias = ?, is_active = ?, display_order = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `,
    )
      .bind(name, alias, isActive, displayOrder, now, input.id, sessionUser.id)
      .run();

    const updated = await env.DB.prepare("SELECT * FROM channels WHERE id = ? AND user_id = ?")
      .bind(input.id, sessionUser.id)
      .first<ChannelRow>();

    return json({ data: updated ? mapChannel(updated) : null });
  } catch (error) {
    return serverError(error);
  }
};
