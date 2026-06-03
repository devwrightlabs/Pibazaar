---
name: drizzle-zod + zod v4
description: Why lib/db schema files import zod from "zod/v4" instead of "zod"
---

drizzle-zod 0.8.x internally does `require('zod/v4')`, so `createInsertSchema()` returns a **zod v4** `ZodObject`. zod 3.25.x ships both v3 (classic, default `"zod"` export) and v4 (`"zod/v4"` subpath).

**Rule:** In `lib/db/src/schema/*.ts`, import `z` from `"zod/v4"`. Using the default `"zod"` (v3) makes `export type InsertX = z.infer<typeof insertXSchema>` fail with TS2344 — the v4 schema doesn't satisfy v3's `ZodType<any,any,any>` constraint (missing `_type`, `_parse`, etc.).

**Why:** `z.infer` here is type-only (erased at runtime), so switching the import is safe — no runtime/drizzle-kit behavior change. Symptom if wrong: db package fails `tsc`, which cascades into api-server resolving `@workspace/db` exports as broken ("no exported member users/listings/...").

**How to apply:** Any new schema file in lib/db, or any zod version bump, keep the `zod/v4` import. api-server's *own* request-validation zod (inline `z.object`) can stay on plain `"zod"` since it never mixes with drizzle-zod outputs.
