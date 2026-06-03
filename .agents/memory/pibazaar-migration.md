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
- Vite `server.proxy` configured to forward `/api/*` → `http://localhost:8080` (api-server port), with `ws: true` for the realtime WebSocket bridge (`/api/ws?token=`).

## Supabase fully removed (web)
- The web app no longer uses Supabase at all. All server state goes through the self-contained typed client in `src/lib/api/{types,client,hooks}.ts` (Bearer JWT in localStorage `pibazaar-token`, all shapes camelCase, money fields are numbers). Realtime via `src/lib/realtime.ts` + `useRealtimeSync`. The old `src/lib/supabase*`, `env.ts`, `storage.ts`, `database.types.ts`, and old snake_case `types.ts` were deleted.
- **Why:** auth + data now owned by api-server (`API_CONTRACT.md`); reintroducing Supabase would split the source of truth.

## Conversations list shape (gotcha)
- `GET /conversations` returns per-row `{ id, listingId, listingTitle, lastMessage, lastMessageAt, createdAt, unread, otherUser }` — NO `participantA`/`participantB`, and the unread field is `unread` (not `unreadCount`). The other party is pre-enriched as `otherUser`, so the client never needs to derive it from participant ids.

## Escrow fee model (business rule)
- Buyer pays the item price (`escrow.amountPi`) into escrow. The 2% platform fee (`platformFeeRate=0.02`) is deducted from the SELLER's payout on release — it is NOT added to the buyer's total. Checkout "You pay" must equal `amountPi`.

## Web build env (quirk)
- The pibazaar web build/dev throws unless `PORT` and `BASE_PATH` env vars are set (vite config reads them eagerly). Build locally with `PORT=5000 BASE_PATH=/ NODE_ENV=production pnpm build`.

## Mobile (Expo) migration off Supabase
- The Expo app (`artifacts/pibazaar-mobile`) uses a hand-rolled typed client (`lib/api/{types,client,hooks}.ts`) mirroring the web client, NOT generated from `lib/api-spec/openapi.yaml` (that spec only defines `/healthz`). Base URL is absolute via `EXPO_PUBLIC_DOMAIN`; JWT in AsyncStorage key `@pibazaar/session_token`; realtime over RN `WebSocket` in `lib/realtime.ts`.
- **Why:** the OpenAPI spec is not the source of truth for app endpoints — `API_CONTRACT.md` is. Don't try to codegen the mobile client.

## Escrow Pi payment funding (Pi-Browser-only)
- Funding `pending → funded` requires a real Pi payment: client calls `createPiPayment({ amount: escrow.amountPi, memo, metadata: { escrowId } })` then `escrowApi.approve(id, paymentId)` (onReadyForServerApproval) and `escrowApi.complete(id, paymentId, txid)` (onReadyForServerCompletion). `window.Pi` only exists in the Pi Browser, so mobile uses `lib/pi.ts` `isPiAvailable()` to degrade gracefully on native/Expo Go.
- **Why:** server verifies the payment amount + `metadata.escrowId` against the escrow (rejects mismatches); the buyer MUST bind the payment this way or it's rejected 400.

## Escrow lifecycle gating (must match server, api-server/src/routes/escrow.ts)
- `ship` body key is `shippingCarrier` (NOT `carrier`).
- `cancel` is allowed ONLY when status is `pending` ("Only unfunded escrows can be cancelled").
- `confirm` (buyer release) allowed at `funded|shipped|delivered`. UI rule: shipping orders confirm at `shipped/delivered`; digital/other release types confirm at `funded`. Gate the confirm button with `!isMeetup` so local-meetup uses the separate meetup-code release flow instead.

## Image components
- All `next/image` `<Image fill />` replaced with `<img className="w-full h-full object-cover" />`.

## Button component
- Added `'icon'` to both `variant` and `size` unions (used by shadcn-style sidebar, calendar, carousel, pagination).
- Added `buttonVariants()` compatibility shim for shadcn components that import it.

**Why:** The original app mixed Next.js server and client patterns; Vite only runs client-side code.
