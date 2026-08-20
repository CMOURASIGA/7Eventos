/**
 * Assinatura simples de sessão (HMAC-SHA256) usando Web Crypto, compatível
 * com o runtime Edge do middleware e com o runtime Node das server
 * actions/route handlers — evita depender de `node:crypto`.
 *
 * Não é um JWT completo: é suficiente para a Fase 1, onde o cookie
 * carrega apenas o `userId` e a integridade é o que importa (o
 * conteúdo da sessão de negócio é sempre recarregado do repositório a
 * cada requisição, nunca confiado a partir do cookie).
 */

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const str = atob(padded);
  return Uint8Array.from(str, (c) => c.charCodeAt(0));
}

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    "7eventos-dev-secret-nao-usar-em-producao-configure-SESSION_SECRET"
  );
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface TokenPayload {
  userId: string;
  issuedAt: number;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const key = await getKey();
  const body = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${base64url(signature)}`;
}

export async function verifyToken(token: string | undefined | null): Promise<TokenPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const key = await getKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(signature) as BufferSource,
      encoder.encode(body),
    );
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(base64urlToBytes(body))) as TokenPayload;
  } catch {
    return null;
  }
}
