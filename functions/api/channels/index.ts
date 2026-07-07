import { badRequest, json, readJson, serverError } from "../../_shared/http";
import { createId } from "../../_shared/ids";
import { mapChannel } from "../../_shared/mappers";
import type { AppPagesFunction, ChannelRow } from "../../_shared/types";

interface ChannelCreateInput {
  name?: string;
  alias?: string;
  type?: ChannelRow["type"];
  isActive?: boolean;
}

export const onRequestGet: AppPagesFunction = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM channels ORDER BY display_order ASC, name ASC`,
    ).all<ChannelRow>();

    return json({ data: results.map(mapChannel) });
  } catch (error) {
    return serverError(error);
  }
};

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    // Phase 4에서 세션 검사를 이 함수의 맨 앞에 넣어 인증 전 D1 쓰기를 막는다.
    const input = await readJson<ChannelCreateInput>(request);
    const name = input.name?.trim();

    if (!name) {
      return badRequest("채널명을 입력해주세요.");
    }

    const maxOrder = await env.DB.prepare(
      `SELECT COALESCE(MAX(display_order), 0) AS value FROM channels`,
    ).first<{ value: number }>();

    const now = new Date().toISOString();
    const id = createId("channel");

    await env.DB.prepare(
      `
        INSERT INTO channels (
          id, name, alias, type, is_active, display_order, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        name,
        input.alias?.trim() || null,
        input.type ?? "home_shopping",
        input.isActive === false ? 0 : 1,
        (maxOrder?.value ?? 0) + 1,
        now,
        now,
      )
      .run();

    const row = await env.DB.prepare(`SELECT * FROM channels WHERE id = ?`)
      .bind(id)
      .first<ChannelRow>();

    return json({ data: row ? mapChannel(row) : null }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
};

