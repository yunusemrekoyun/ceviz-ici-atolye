export const ACCESS_COOKIE_NAME = 'kgo_access';
export const REFRESH_COOKIE_NAME = 'kgo_refresh';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

export const ROLE_SLUGS = ['admin', 'personel', 'muhasebe', 'musteri', 'temizlikci'] as const;

export type RoleSlug = (typeof ROLE_SLUGS)[number];

export const ROLE_NAMES: Record<RoleSlug, string> = {
  admin: 'Admin',
  personel: 'Personel',
  muhasebe: 'Muhasebe',
  musteri: 'Müşteri',
  temizlikci: 'Kat Hizmetleri',
};

export function isRoleSlug(value: string): value is RoleSlug {
  return ROLE_SLUGS.includes(value as RoleSlug);
}
