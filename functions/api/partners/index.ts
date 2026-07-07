import { badRequest, json, readJson, serverError } from "../../_shared/http";
import { createId } from "../../_shared/ids";
import { mapPartner } from "../../_shared/mappers";
import type { AppPagesFunction, PartnerRow } from "../../_shared/types";

interface PartnerCreateInput {
  name?: string;
  type?: PartnerRow["type"];
  contactName?: string;
  contactPhone?: string;
  memo?: string;
}

export const onRequestGet: AppPagesFunction = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM partners ORDER BY name ASC`,
    ).all<PartnerRow>();

    return json({ data: results.map(mapPartner) });
  } catch (error) {
    return serverError(error);
  }
};

export const onRequestPost: AppPagesFunction = async ({ env, request }) => {
  try {
    // Phase 4에서 이 지점 앞에 세션 검사를 추가한다. 인증 실패 시 D1 접근 전 반환해야 한다.
    const input = await readJson<PartnerCreateInput>(request);
    const name = input.name?.trim();
    const type = input.type ?? "supplier";

    if (!name) {
      return badRequest("업체명을 입력해주세요.");
    }

    const now = new Date().toISOString();
    const id = createId("partner");

    await env.DB.prepare(
      `
        INSERT INTO partners (
          id, name, type, contact_name, contact_phone, memo, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
      .bind(
        id,
        name,
        type,
        input.contactName?.trim() || null,
        input.contactPhone?.trim() || null,
        input.memo?.trim() || null,
        now,
        now,
      )
      .run();

    const row = await env.DB.prepare(`SELECT * FROM partners WHERE id = ?`)
      .bind(id)
      .first<PartnerRow>();

    return json({ data: row ? mapPartner(row) : null }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
};

