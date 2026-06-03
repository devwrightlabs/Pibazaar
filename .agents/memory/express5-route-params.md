---
name: Express 5 route params
description: req.params typing quirk and route-ordering gotcha in api-server
---

**Param typing:** Under Express 5 + its @types, `req.params.x` is `string | string[]` (path-to-regexp v8 supports repeatable params). Passing it directly to Drizzle `eq(col, ...)` or a `string` arg fails `tsc`. Use the `param(req, name)` helper in `artifacts/api-server/src/lib/http.ts`, which collapses to a single string.

**Route ordering:** Routers are mounted at root in `routes/index.ts` (no per-router prefix), so a route file owns its full path (e.g. users.ts defines both `/users/me*` and `/users/:id`). Literal segment routes MUST be registered before the `:id` param route, or `/users/me` is captured by `/users/:id` (id="me") → "invalid input syntax for type uuid". Caught at runtime, not typecheck.

**Why:** Both bit during api-server verification — `/users/me` 500'd because it was reached via `/:id`, and every `req.params.id` use failed strict typecheck.
