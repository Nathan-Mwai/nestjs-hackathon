# Memory — Arcjet Integration & Global Rate Limiting

Last updated: 2026-09-02T10:22:00Z

## What was built

- Integrated Arcjet into NestJS 11 backend using `@arcjet/nest` and `@nestjs/config`.
- Created site `nestjs-hackathon` (ID: `site_01m1grzh4ffertj6qy2ge8a93g`) via Arcjet CLI and configured `ARCJET_KEY`, `ARCJET_ENV=development`, and `ARCJET_MODE=LIVE` in `.env`.
- Implemented global infrastructure module `src/lib/arcjet/arcjet.module.ts` using `ArcjetModule.forRootAsync` with `ConfigService`.
- Configured global `shield({ mode: 'LIVE' })` and `fixedWindow({ mode: 'LIVE', window: '60s', max: 10 })` with `ArcjetGuard` registered as `APP_GUARD`.
- Imported `ConfigModule` and `ArcjetSecurityModule` in `src/app.module.ts`.

## Decisions made

- Used `ArcjetModule.forRootAsync` injected with `ConfigService` rather than static `forRoot` so that environment variables in `.env` are reliably loaded before Arcjet initializes.
- Placed Arcjet security infrastructure under `src/lib/arcjet/` marked `@Global()` conforming to NestJS-first architecture in `AGENTS.md`.

## Problems solved

- Fixed `EADDRINUSE` port collision where previous server instances prevented the updated rate-limiting server from listening.
- Solved static environment variable timing issue by switching to async module initialization with `ConfigService`.

## Current state

- Project compiles cleanly with `nest build` and `oxlint`.
- Global Shield and 10-request fixed window rate limiting configured and ready for testing.

## Next session starts with

- Run `pnpm run start:dev` and execute the 60-curl test loop to observe rate limiting in action (first 10 return 200, remaining return 403).
