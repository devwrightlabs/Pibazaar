# PiBazaar API Contract

Base URL (dev): `http://localhost:8080/api` — in production behind the artifact path prefix.
All JSON. Auth via `Authorization: Bearer <JWT>` (also accepted as `token` cookie).
JWT: HS256, 30-day expiry, payload `{ sub, piUid, username, role }`.

## Conventions
- Money fields (`priceInPi`, `amountPi`, `platformFeePi`, `trustScore`) are returned as **numbers** (serialized from DB numeric strings).
- Errors: `{ "error": string }` with appropriate HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict, 500 internal).
- Writes require auth; reads of public resources (listings, public profiles, shipping carriers) do not.
- `platformFeeRate` = 0.02 (2%) applied on escrow release.

---

## Auth — `/auth`
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/signup` | no | `{ username(3-30, [a-zA-Z0-9_.]), password(8-128), email? }` | `201 { token, user }` |
| POST | `/auth/login` | no | `{ username, password }` | `200 { token, user }` |
| POST | `/auth/pi` | optional | `{ accessToken, walletAddress? }` | `200 { token, isNewUser, user }` |
| POST | `/auth/logout` | no | — | `{ ok: true }` (clears cookie) |
| GET | `/auth/me` | yes | — | `{ user }` |

Two-step Pi flow: users **sign up** manually first (username/password), then **log in** with the Pi SDK (`/auth/pi`). Behavior of `/auth/pi` depends on whether a Bearer token is sent:
- **With** a valid Bearer token (linking mode) → the Pi identity (`piUid`) is attached to the currently-authenticated account. Fails `409` if that Pi account is already linked to a different user.
- **Without** a token → logs in the existing user matched by `piUid`, or provisions a new Pi-only account (`isNewUser: true`) if none exists.

## Users — `/users`
| Method | Path | Auth | Body / Notes | Response |
|---|---|---|---|---|
| GET | `/users/me` | yes | — | `{ user }` (self, no passwordHash) |
| PATCH | `/users/me` | yes | `{ username?, bio?, avatarUrl?, email?, walletAddress?, themePreference?(dark\|light), jurisdictionMode?(local\|global), country? }` | `{ user }` |
| GET | `/users/me/listings` | yes | `?status=` | `{ listings }` (incl. drafts) |
| GET | `/users/me/dashboard` | yes | — | `{ activeListings, draftListings, sales, purchases, activeEscrows, revenuePi, unreadNotifications, unreadMessages }` |
| GET | `/users/:id` | no | — | `{ user }` (public subset) |
| GET | `/users/:id/listings` | no | — | `{ listings }` (active only) |
| GET | `/users/:id/reviews` | no | — | `{ reviews }` |

> **Route ordering note:** `/users/me*` literals are registered *before* `/users/:id`; keep them in that order or `:id` will capture `me`.

## Listings — `/listings`
| Method | Path | Auth | Body / Query | Response |
|---|---|---|---|---|
| GET | `/listings` | no | `?q, category, condition, productType, country, sellerId, minPrice, maxPrice, sort(recent\|price_asc\|price_desc), limit(≤100), offset` | `{ listings, total, limit, offset }` |
| GET | `/listings/:id` | no | — | `{ listing, seller }` |
| POST | `/listings` | yes | see below | `201 { listing }` |
| PATCH | `/listings/:id` | yes (owner) | partial of create body | `{ listing }` |
| DELETE | `/listings/:id` | yes (owner) | — | `{ ok: true }` (soft delete) |

Create body: `{ title(1-140), description?(≤5000), priceInPi(number≥0), category(1-80), condition?(new|like_new|good|fair), productType?(physical|digital|service), status?(draft|active|scheduled), images?(string[]≤20), locationLat?, locationLng?, city?, country?, originCountry?, allowOffers?, shippingCarrier?, scheduledFor?(ISO) }`.
Drafts (`status:"draft"`) relax all fields except `status`, enabling media-first autosave.

## Escrow — `/escrow`
Lifecycle: `pending → funded → shipped → delivered → released/completed` (plus `auto_released`, `disputed`, `cancelled`).

| Method | Path | Auth | Body / Notes | Response |
|---|---|---|---|---|
| GET | `/escrow` | yes | `?role=buyer\|seller` | `{ escrows }` |
| GET | `/escrow/:id` | yes (participant) | — | `{ escrow }` |
| POST | `/escrow` | yes (buyer) | `{ listingId(uuid), releaseType?(shipping|local_meetup|digital), shippingAddressId?, shippingMethod?, milestones?[{title, amountPi}] }` | `201 { escrow }` (price read from listing in DB) |
| POST | `/escrow/:id/approve` | yes | `{ paymentId }` — server fetches + verifies the Pi payment, then calls Pi `/payments/:id/approve` | `{ escrow }` |
| POST | `/escrow/:id/complete` | yes | `{ paymentId, txid }` — server verifies the Pi payment, then calls Pi `/payments/:id/complete`; → `funded` | `{ escrow }` |

> **Payment binding (required):** the client MUST create the Pi payment with `amount` equal to the escrow's `amountPi` and `metadata: { escrowId }`. The server fetches the payment via Pi `/payments/:id` and rejects (`400`) any payment whose amount doesn't match or whose `metadata.escrowId` doesn't match the escrow being paid — preventing reuse of a foreign/mismatched payment.
| POST | `/escrow/:id/ship` | yes (seller) | `{ trackingNumber?, carrier? }` → `shipped` | `{ escrow }` |
| POST | `/escrow/:id/deliver` | yes (seller) | → `delivered` | `{ escrow }` |
| POST | `/escrow/:id/confirm` | yes (buyer) | release funds → `released/completed`; records platform revenue, bumps seller totalSales | `{ escrow }` |
| GET | `/escrow/:id/meetup-code` | yes (buyer) | local-meetup QR payload | `{ code }` |
| POST | `/escrow/:id/meetup/release` | yes (seller) | `{ code }` — QR release for local meetups | `{ escrow }` |
| POST | `/escrow/:id/milestones/:milestoneId/release` | yes (buyer) | release one digital milestone | `{ escrow }` |
| POST | `/escrow/:id/dispute` | yes (participant) | `{ reason? }` → `disputed` | `{ escrow }` |
| POST | `/escrow/:id/cancel` | yes (participant) | → `cancelled` (only pre-funding) | `{ escrow }` |

> `approve`/`complete` require `PI_API_KEY` (server-to-server Pi Platform calls).

## Conversations & Messages — `/conversations`
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/conversations` | yes | — | `{ conversations }` |
| POST | `/conversations` | yes | `{ recipientId(uuid), listingId?(uuid), content(1-4000) }` | `201 { conversationId, message }` |
| GET | `/conversations/:id/messages` | yes (participant) | `?limit, before` | `{ messages }` |
| POST | `/conversations/:id/messages` | yes (participant) | `{ content(1-4000) }` | `201 { message }` |

New messages are pushed in realtime (see WebSocket) and create a notification for the recipient.

## Notifications — `/notifications`
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/notifications` | yes | `{ notifications, unread }` |
| POST | `/notifications/read-all` | yes | `{ ok: true }` |
| POST | `/notifications/:id/read` | yes | `{ ok: true }` |

## Reviews — `/reviews`
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/reviews` | yes (escrow participant) | `{ escrowId(uuid), rating(1-5 int), comment?(≤1000) }` | `201 { review }` (recomputes reviewee trustScore) |

## Addresses — `/addresses`
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/addresses` | yes | — | `{ addresses }` |
| POST | `/addresses` | yes | `{ fullName(1-140), streetAddress(1-300), city(1-120), stateProvince?, postalCode?, countryCode(2), phoneNumber?, isDefault? }` | `201 { address }` |
| PATCH | `/addresses/:id` | yes (owner) | partial | `{ address }` |
| DELETE | `/addresses/:id` | yes (owner) | — | `{ ok: true }` |

## Shipping Directory — `/shipping`
**Informational only.** PiBazaar does not manage, track, or facilitate shipping. Couriers are surfaced as outbound links grouped by coverage; all fulfillment/handling is arranged offline between buyer and seller. Clients MUST render the returned `disclaimer` prominently.

| Method | Path | Auth | Query / Body | Response |
|---|---|---|---|---|
| GET | `/shipping/carriers` | no | `?country=(ISO-2)`, `?serviceRange=(local\|regional\|international)` | `{ carriers, grouped, disclaimer }` |
| POST | `/shipping/carriers` | yes (admin) | `{ name, countryCode(2), countryName?, serviceRange?(local\|regional\|international), websiteUrl, logoUrl?, description?, isActive?, sortOrder? }` | `201 { carrier }` |

- Each carrier: `{ id, name, countryCode, countryName, serviceRange, websiteUrl, logoUrl, description, isActive, sortOrder }`. `websiteUrl` is the external portal the client links out to.
- `grouped` is `{ local: [...], regional: [...], international: [...] }` — the same carriers pre-bucketed by `serviceRange` for clean directory sections.
- `disclaimer` is a ready-to-display string stating fulfillment happens entirely offline.

## Object Storage — `/storage`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/storage/uploads/request-url` | yes | → `{ uploadURL, objectPath, metadata }`. Client PUTs the file to `uploadURL`, then references `objectPath`. |
| GET | `/storage/public-objects/*filePath` | no | serve public asset |
| GET | `/storage/objects/*path` | yes (ACL) | serve private object |

## Realtime — WebSocket
- Endpoint: `ws(s)://<host>/api/ws?token=<JWT>` (token via query or `Authorization`).
- Server → client events: `{ type: "message", payload }` (new chat message) and `{ type: "notification", payload }`.
- Clients are bucketed per authenticated user; messages/notifications are pushed to the relevant user only.

## Health
- GET `/healthz` → `{ status: "ok" }` (no auth).
