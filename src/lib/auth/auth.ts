import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin } from 'better-auth/plugins/admin';
import { adminAc, userAc } from 'better-auth/plugins/admin/access';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'PARTICIPANT',
        input: false,
      },
    },
  },
  plugins: [
    admin({
      defaultRole: 'PARTICIPANT',
      adminRoles: ['ADMIN'],
      roles: {
        ADMIN: adminAc,
        PARTICIPANT: userAc,
      },
    }),
  ],
});

export type Auth = typeof auth;
