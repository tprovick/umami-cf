// CF-WORKERS-ADAPTER: replaces `jsonwebtoken` + the manual aes-gcm wrapper in
// crypto.ts with `jose`. jsonwebtoken uses node:crypto sync APIs that hang
// under the Workers `nodejs_compat` polyfill on the success path of
// /api/auth/login; jose runs on Web Crypto and works everywhere.
//
// All functions are now async — callers that previously assigned the result
// synchronously must `await` (auth.ts saveAuth/checkAuth, login route,
// send/share routes that produce tracker tokens).
import { EncryptJWT, jwtDecrypt, jwtVerify, SignJWT } from 'jose';
import type { JWTPayload } from 'jose';

const HS256 = 'HS256';
const JWE_ALG = 'dir';
const JWE_ENC = 'A256GCM';

const encoder = new TextEncoder();

function hs256Key(secret: string): Uint8Array {
  return encoder.encode(secret);
}

// A256GCM expects exactly 32 bytes. `secret()` returns a 128-char hex sha512;
// the first 64 hex chars hex-decode to a stable 32-byte key.
function jweKey(secret: string): Uint8Array {
  const hex = secret.slice(0, 64);
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function createToken(payload: any, secret: any): Promise<string> {
  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: HS256 })
    .setIssuedAt()
    .sign(hs256Key(secret));
}

export async function parseToken(token: string, secret: any) {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, hs256Key(secret));
    return payload;
  } catch {
    return null;
  }
}

export async function createSecureToken(payload: any, secret: any): Promise<string> {
  return new EncryptJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: JWE_ALG, enc: JWE_ENC })
    .setIssuedAt()
    .encrypt(jweKey(secret));
}

export async function parseSecureToken(token: string, secret: any) {
  try {
    if (!token) return null;
    const { payload } = await jwtDecrypt(token, jweKey(secret));
    return payload;
  } catch {
    return null;
  }
}

export async function parseAuthToken(req: Request, secret: string) {
  const token = req.headers.get('authorization')?.split(' ')?.[1];
  return parseSecureToken(token as string, secret);
}
