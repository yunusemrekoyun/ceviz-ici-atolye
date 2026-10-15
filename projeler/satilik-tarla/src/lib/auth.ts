import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import { prisma } from './prisma';
import { emailQueue } from './queue';

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await emailQueue.add('reset-password', {
        kind: 'reset-password',
        to: user.email,
        url,
        name: user.name,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await emailQueue.add('verify-email', {
        kind: 'verify-email',
        to: user.email,
        url,
        name: user.name,
      });
    },
  },
  // defaultRole:"user", adminRoles:["admin"] — PDD'nin admin/user rol modeliyle örtüşüyor.
  plugins: [admin()],
});
