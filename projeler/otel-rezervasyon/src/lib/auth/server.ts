import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, type RoleSlug } from './constants';
import { getAuthContextFromTokens } from './session';

export async function getAuthContextFromCookies() {
  const cookieStore = await cookies();

  return getAuthContextFromTokens(
    cookieStore.get(ACCESS_COOKIE_NAME)?.value,
    cookieStore.get(REFRESH_COOKIE_NAME)?.value,
  );
}

export async function requireRole(roleSlug: RoleSlug) {
  const context = await getAuthContextFromCookies();

  if (!context) {
    redirect('/');
  }

  if (context.user.roleSlug !== roleSlug) {
    redirect(`/${context.user.roleSlug}`);
  }

  return context;
}
