# Memory — Better Auth NestJS Integration & Role Management

Last updated: 2026-09-02T16:09:00Z

## What was built

- Integrated Better Auth with NestJS 11 using `@thallesp/nestjs-better-auth` and `better-auth`.
- Created `src/lib/auth/auth.ts` setting up Better Auth with Prisma adapter, email/password authentication, and the admin plugin.
- Configured user roles: defaults to `PARTICIPANT` and restricted from client-side input during sign-up via `input: false` and admin plugin access controls.
- Updated `prisma/schema.prisma` with Better Auth models (`User`, `Session`, `Account` with `issuer`, `Verification`) and migrated database using `prisma migrate dev`.
- Configured `src/main.ts` with `bodyParser: false` to allow Better Auth to handle raw payloads.
- Registered `AuthModule.forRoot({ auth, isGlobal: true })` in `src/app.module.ts`.
- Added authentication and role-protected example endpoints (`/me`, `/participant`, `/admin`, `@AllowAnonymous()` on `/`) in `src/app.controller.ts`.
- Disabled declaration generation in `tsconfig.json` and `tsconfig.build.json` to ensure clean incremental builds without TS2883 type export errors.
- Created comprehensive E2E test suite in `test/auth.e2e-spec.ts` covering anonymous endpoints, sign-up role restrictions, session creation, and role guards.

## Decisions made

- Followed official NestJS integration pattern (`@thallesp/nestjs-better-auth`) which provides global `AuthGuard`, `@Session()`, `@AllowAnonymous()`, and `@Roles()` decorators.
- Configured `PrismaClient` with `DIRECT_URL` fallback in `src/lib/auth/auth.ts` and `src/lib/database/prisma.service.ts` to ensure consistent immediate database writes.
- Restricted `role` from the sign-up payload schema so users cannot self-escalate to `ADMIN`.

## Problems solved

- Resolved Prisma schema foreign key type alignment between `User.id` (String) and `Session`/`Account` foreign keys.
- Resolved Prisma 6.19+ `issuer` requirement on `Account` model for Better Auth 1.7+.
- Resolved TS2883 declaration portability error on `auth` export during `nest start --watch`.

## Current state

- All servers and background tasks terminated.
- All unit/e2e tests pass cleanly (`pnpm run test:e2e`).
- Linting (`oxlint`) passes with 0 errors and 0 warnings.
- Production build succeeds (`nest build`).

## Next session starts with

- Implement hackathon-specific feature modules under `src/module/` utilizing `@Session()`, `@Roles()`, and `PrismaService`.

## Open questions

- None.
