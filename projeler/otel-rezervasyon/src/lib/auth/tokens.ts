import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { ACCESS_TOKEN_TTL_SECONDS, type RoleSlug } from './constants';

export interface AccessTokenInput {
  userId: string;
  email: string;
  roleName: string;
  roleSlug: RoleSlug;
  sessionId: string;
}

export interface AccessTokenPayload extends AccessTokenInput {
  expiresAt: number;
}

function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET ?? process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('JWT_ACCESS_SECRET must be set to at least 32 characters.');
  }

  return new TextEncoder().encode(secret);
}

export async function signAccessToken(input: AccessTokenInput) {
  return new SignJWT({
    email: input.email,
    roleName: input.roleName,
    roleSlug: input.roleSlug,
    sid: input.sessionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token?: string): Promise<AccessTokenPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.roleName !== 'string' ||
      typeof payload.roleSlug !== 'string' ||
      typeof payload.sid !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email,
      roleName: payload.roleName,
      roleSlug: payload.roleSlug as RoleSlug,
      sessionId: payload.sid,
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}

export function createRefreshToken() {
  return randomBytes(48).toString('base64url');
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
