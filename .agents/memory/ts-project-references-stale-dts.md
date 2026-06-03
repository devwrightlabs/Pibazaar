---
name: TS project references serve stale .d.ts
description: Why api-server tsc reports errors on lib/db schema changes that lib/db itself compiles cleanly
---

`artifacts/api-server/tsconfig.json` lists a TypeScript project `reference` to
`lib/db`. With project references, `tsc` for api-server resolves `@workspace/db`
types from lib/db's **emitted declaration files** (`lib/db/dist/*.d.ts`), NOT
from `lib/db/src`, even though lib/db's `package.json` `exports` point at `src`
for runtime. So a schema change in `lib/db/src/schema/*` is invisible to
api-server's typecheck until lib/db's declarations are rebuilt.

**Symptom:** lib/db `tsc --noEmit` passes, but `artifacts/api-server` `tsc`
reports TS2339 "property not found" on a column/field you just added.

**Fix:** rebuild the referenced project's declarations, then typecheck:
`cd lib/db && npx tsc -b . --force` then api-server `tsc --noEmit`.

**Why:** deleting `.tsbuildinfo` alone is NOT enough — the consumer reads the
stale `.d.ts`, not the build cache. You must regenerate the `.d.ts`.

**How to apply:** after any change to `lib/db` schema/types, run `tsc -b` on
lib/db (or `tsc -b artifacts/api-server`, which builds references first) before
trusting api-server's typecheck.
