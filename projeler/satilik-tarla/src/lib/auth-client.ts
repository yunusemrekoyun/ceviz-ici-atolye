'use client';

import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // Boşsa same-origin kullanılır — prod'da build arg'ı, dev'de .env sağlar.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || undefined,
  plugins: [adminClient()],
});
