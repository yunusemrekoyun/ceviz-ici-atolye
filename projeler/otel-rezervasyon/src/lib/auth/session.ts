import type { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ACCESS_COOKIE_NAME,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_COOKIE_NAME,
  REFRESH_TOKEN_TTL_SECONDS,
  type RoleSlug,
} from './constants';
import {
  createRefreshToken,
  hashRefreshToken,
  signAccessToken,
  verifyAccessToken,
} from './tokens';

export interface AuthUser {
  id: string;
  email: string;
  roleName: string;
  roleSlug: RoleSlug;
  emailVerified: boolean;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
  source: 'access' | 'refresh';
}

export interface IssuedAuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const secureCookies = process.env.NODE_ENV === 'production';

function toAuthUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  role: {
    name: string;
    slug: string;
  };
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    roleName: user.role.name,
    roleSlug: user.role.slug as RoleSlug,
    emailVerified: user.emailVerified,
  };
}

function getRefreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);
}

export async function issueAuthSession({
  user,
  request,
}: {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    role: {
      name: string;
      slug: string;
    };
  };
  request: NextRequest;
}): Promise<IssuedAuthSession> {
  const refreshToken = createRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const authUser = toAuthUser(user);

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      userAgent: request.headers.get('user-agent'),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip'),
      expiresAt: getRefreshExpiresAt(),
    },
  });

  const accessToken = await signAccessToken({
    userId: authUser.id,
    email: authUser.email,
    roleName: authUser.roleName,
    roleSlug: authUser.roleSlug,
    sessionId: session.id,
  });

  return {
    accessToken,
    refreshToken,
    user: authUser,
  };
}

export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  response.cookies.set(ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: secureCookies,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getAuthContextFromTokens(accessToken?: string, refreshToken?: string): Promise<AuthContext | null> {
  const accessPayload = await verifyAccessToken(accessToken);

  if (accessPayload) {
    const session = await prisma.session.findUnique({
      where: {
        id: accessPayload.sessionId,
      },
      include: {
        user: {
          include: {
            role: true,
          },
        },
      },
    });

    if (
      session &&
      session.userId === accessPayload.userId &&
      !session.revokedAt &&
      session.expiresAt.getTime() > Date.now() &&
      session.user.isActive
    ) {
      return {
        user: toAuthUser(session.user),
        sessionId: session.id,
        source: 'access',
      };
    }
  }

  if (!refreshToken) return null;

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashRefreshToken(refreshToken),
    },
    include: {
      user: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    return null;
  }

  return {
    user: toAuthUser(session.user),
    sessionId: session.id,
    source: 'refresh',
  };
}

export async function getAuthContextFromRequest(request: NextRequest) {
  return getAuthContextFromTokens(
    request.cookies.get(ACCESS_COOKIE_NAME)?.value,
    request.cookies.get(REFRESH_COOKIE_NAME)?.value,
  );
}

export async function rotateRefreshSession(request: NextRequest) {
  const currentRefreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (!currentRefreshToken) return null;

  const currentTokenHash = hashRefreshToken(currentRefreshToken);
  const session = await prisma.session.findUnique({
    where: {
      tokenHash: currentTokenHash,
    },
    include: {
      user: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
    return null;
  }

  const refreshToken = createRefreshToken();
  const authUser = toAuthUser(session.user);

  await prisma.session.update({
    where: {
      id: session.id,
    },
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      lastUsedAt: new Date(),
      expiresAt: getRefreshExpiresAt(),
    },
  });

  const accessToken = await signAccessToken({
    userId: authUser.id,
    email: authUser.email,
    roleName: authUser.roleName,
    roleSlug: authUser.roleSlug,
    sessionId: session.id,
  });

  return {
    accessToken,
    refreshToken,
    user: authUser,
  };
}
