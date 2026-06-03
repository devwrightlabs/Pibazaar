---
name: api-server stack
description: PiBazaar backend architecture and how to verify it
---

PiBazaar backend (`artifacts/api-server`): Express + Drizzle ORM + Replit PostgreSQL, schema in `lib/db/src/schema` (`@workspace/db`).

- **Build:** `build.mjs` (esbuild) bundles to `dist/index.mjs` — **no typecheck at runtime**. Run `npx tsc --noEmit` separately for type safety. esbuild resolves `@workspace/db` via package `exports` → `src` (not `dist`), so stale `lib/db/dist` only affects `tsc`, not the running server.
- **Auth:** own JWT (HS256, 30d, `{sub,piUid,username,role}`), `JWT_SECRET` secret. Two-step Pi auth: manual signup (username/password, scrypt) then Pi SDK login (`/auth/pi` verifies via Pi `/v2/me`). `PI_API_KEY` needed only for escrow approve/complete (server-to-server Pi Platform payment calls).
- **Realtime:** ws server at `/api/ws?token=<JWT>`, per-user buckets, pushes `message` + `notification` events.
- **Contract:** full request/response surface documented in `artifacts/api-server/API_CONTRACT.md` (the source of truth for the web and mobile clients that consume this API).
- **Money:** DB numeric columns are strings; serializers convert to numbers. Platform fee 2% on escrow release.
