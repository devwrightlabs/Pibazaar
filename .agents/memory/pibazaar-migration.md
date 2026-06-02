---
name: PiBazaar Migration
description: Documents key decisions and patterns from migrating PiBazaar from Next.js/Vercel to Replit pnpm_workspace (Vite + wouter).
---

# PiBazaar: Next.js → Vite Migration Decisions

## Routing
- Replaced `next/navigation` (`useRouter`, `useParams`, `useSearchParams`) with wouter equivalents.
- `useParams<{ id: string }>()` for dynamic segments; `useSearch()` + `new URLSearchParams()` for query strings.
- Removed all `async function Page()` server component patterns — converted to `useEffect`-based fetching.

## Server-only files
Files that imported `next/server` or `next/headers` were stubbed to `export {}`:
- `src/lib/authHelper.ts`, `src/lib/cacheHeaders.ts`, `src/lib/rateLimit.ts`, `src/lib/supabase-server.ts`
- `src/middleware.ts`, `src/actions/chat.ts` (replaced with client `fetch`)

## Env vars
- `NEXT_PUBLIC_SUPABASE_*` → `VITE_SUPABASE_*` (already done in `src/lib/env.ts`)
- API routes excluded from tsconfig via `"src/app/api/**/*"` in exclude array

## Duplicate GoTrueClient
- `src/lib/supabase.ts` creates its own client; fixed to call `getSupabaseClient()` from `src/lib/supabaseClient.ts` singleton.

## API Proxy
- Vite `server.proxy` configured to forward `/api/*` → `http://localhost:8080` (api-server port).

## Image components
- All `next/image` `<Image fill />` replaced with `<img className="w-full h-full object-cover" />`.

## Button component
- Added `'icon'` to both `variant` and `size` unions (used by shadcn-style sidebar, calendar, carousel, pagination).
- Added `buttonVariants()` compatibility shim for shadcn components that import it.

**Why:** The original app mixed Next.js server and client patterns; Vite only runs client-side code.
