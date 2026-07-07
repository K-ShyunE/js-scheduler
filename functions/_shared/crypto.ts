import type { Env } from "./types";

export async function encryptSecret(value: string, env: Env) {
  const key = await getEncryptionKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value),
  );

  return `${base64UrlEncodeBytes(iv)}.${base64UrlEncodeBytes(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(encryptedValue: string, env: Env) {
  const [ivStr, dataStr] = encryptedValue.split(".");
  if (!ivStr || !dataStr) {
    throw new Error("올바르지 않은 암호화 형식입니다.");
  }

  const key = await getEncryptionKey(env);
  const iv = base64UrlDecodeBytes(ivStr);
  const data = base64UrlDecodeBytes(dataStr);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}

async function getEncryptionKey(env: Env) {
  const source = env.TOKEN_ENCRYPTION_KEY || env.SESSION_SECRET;

  if (!source) {
    throw new Error("TOKEN_ENCRYPTION_KEY 또는 SESSION_SECRET이 필요합니다.");
  }

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));

  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecodeBytes(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}


