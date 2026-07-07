export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers,
    },
  });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: { message, details } }, { status: 400 });
}

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  return json({ error: { message } }, { status: 500 });
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("JSON 본문을 읽을 수 없습니다.");
  }
}

