---
name: PiBazaar Migration
description: Durable architecture + business-rule decisions for PiBazaar (web Vite+wouter, Expo mobile, Express api-server). Mechanics are derivable from code — only non-obvious decisions kept here.
---

# PiBazaar durable decisions

## Source of truth: api-server, two thin clients
- The web app is fully off Supabase. All server state goes through a self-contained
  typed client (`src/lib/api/`), Bearer JWT in localStorage `pibazaar-token`, all
  shapes camelCase, money fields are numbers. The Expo app mirrors the *same*
  hand-rolled contract — it is NOT codegen'd (the OpenAPI spec only covers
  `/healthz`). `artifacts/api-server/API_CONTRACT.md` is the single source of truth.
- **Why:** auth + data are owned by api-server; reintroducing Supabase or codegen
  would split the source of truth and let web/mobile drift.

## Escrow fee model (business rule)
- Buyer pays the item price (`escrow.amountPi`) into escrow. The 2% platform fee
  (`platformFeeRate=0.02`) is deducted from the SELLER's payout on release — NOT
  added to the buyer's total. Checkout "You pay" must equal `amountPi`.

## Escrow lifecycle gating must mirror the server
- The server is authoritative on state transitions; the UI must only offer actions
  the server will accept. Durable rules: cancel ONLY while unfunded (`pending`);
  buyer release (`confirm`) at `funded|shipped|delivered`, but UI should require
  shipping orders to reach `shipped/delivered` first while digital/other release at
  `funded`; local-meetup uses a separate meetup-code release — exclude it from the
  generic confirm button.
- **Why:** identical web/mobile/server gating prevents a client drifting into
  states the backend rejects (400s).

## Conversations list shape (gotcha)
- `GET /conversations` returns per-row `{ id, listingId, listingTitle, lastMessage,
  lastMessageAt, createdAt, unread, otherUser }` — NO `participantA`/`participantB`;
  unread field is `unread` (not `unreadCount`); the other party is pre-enriched as
  `otherUser`, so the client never derives it from participant ids.

## Pi payments only work inside the Pi Browser
- Funding an escrow (`pending → funded`) needs a real Pi payment carrying the escrow
  id + amount; the server rejects (400) any payment whose amount/escrow-id mismatch.
  `window.Pi` exists only in the Pi Browser, so mobile must feature-detect and
  degrade gracefully on native/Expo Go rather than assume the SDK is present.

## Web build env (quirk)
- The pibazaar web build/dev throws unless `PORT` and `BASE_PATH` are set (vite
  config reads them eagerly). Build with `PORT=5000 BASE_PATH=/ NODE_ENV=production
  pnpm build`.
