import { getServerSession } from './get-session';

type Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;

/** Server action guard'ı: oturum yoksa fırlatır. Her 'use server' action'ın
 * İLK satırında çağrılmalı — layout guard'ları action HTTP endpoint'lerini
 * KORUMAZ. */
export async function requireUser(): Promise<Session> {
  const session = await getServerSession();
  if (!session || session.user.banned) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/** Admin action guard'ı: admin rolü yoksa fırlatır. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireUser();
  if (session.user.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}
