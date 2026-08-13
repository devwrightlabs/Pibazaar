/**
 * PiBazaar E2E customer-journey test.
 *
 * Runs entirely in-process against pglite (memory://) — zero external services.
 * Tests the full marketplace lifecycle:
 *   authenticate → list → escrow (create → fund bypass → ship → deliver → confirm) → review
 *
 * Auth strategy: Pi Network auth requires the Pi SDK (unavailable in CI).
 * Instead, users are inserted directly into pglite and JWT tokens are signed
 * using the same signAuthToken() the real /auth/pi route uses.
 *
 * Pi payment strategy: /escrow/:id/approve + /escrow/:id/complete call the Pi
 * API — unavailable here. We skip those two steps and set escrow="funded"
 * directly in pglite, then test all subsequent lifecycle endpoints normally.
 *
 * Run: pnpm run test:e2e   (from artifacts/api-server)
 */

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// Set env vars before any lazy getter accesses them.
process.env["NODE_ENV"] = "test";
process.env["JWT_SECRET"] = "pibazaar-e2e-test-secret-key-32x!";

// Initialise pglite before importing anything that uses `db` at request time.
import { initDb, db, users, escrowTransactions } from "@workspace/db";
import { eq } from "drizzle-orm";

await initDb();

// Now safe to import app and helpers (db live-binding is ready).
import request from "supertest";
import app from "../src/app.js";
import { signAuthToken } from "../src/lib/jwt.js";

// ── Test helpers ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

type Res = Awaited<ReturnType<ReturnType<typeof request>["get"]>>;

function pass(label: string): void {
  console.log(`  ✓ PASS  ${label}`);
  passed++;
}
function fail(label: string, detail: string): void {
  console.error(`  ✗ FAIL  ${label}: ${detail}`);
  failed++;
}
function assert(label: string, cond: boolean, detail = ""): void {
  cond ? pass(label) : fail(label, detail || "assertion false");
}
function assertStatus(label: string, res: Res, expected: number): boolean {
  if (res.status === expected) { pass(label); return true; }
  fail(label, `expected HTTP ${expected}, got ${res.status} — ${JSON.stringify(res.body).slice(0, 200)}`);
  return false;
}

// Per-request helper: sets Authorization header on each call.
function as(token: string) {
  return {
    get:    (url: string) => request(app).get(url).set("Authorization", `Bearer ${token}`),
    post:   (url: string) => request(app).post(url).set("Authorization", `Bearer ${token}`),
    patch:  (url: string) => request(app).patch(url).set("Authorization", `Bearer ${token}`),
    delete: (url: string) => request(app).delete(url).set("Authorization", `Bearer ${token}`),
  };
}

// ── Seed users directly (Pi auth requires Pi SDK; unavailable here) ────────────

console.log("\n[seed] Inserting seller + buyer into pglite");

const [seller] = await db
  .insert(users)
  .values({ username: "seller_alice", piUid: "pi-uid-alice-001", isVerified: true })
  .returning();

const [buyer] = await db
  .insert(users)
  .values({ username: "buyer_bob", piUid: "pi-uid-bob-002", isVerified: true })
  .returning();

console.log(`  seller id: ${seller.id}`);
console.log(`  buyer  id: ${buyer.id}`);

const sellerToken = signAuthToken({ sub: seller.id, piUid: seller.piUid, username: seller.username, role: seller.role });
const buyerToken  = signAuthToken({ sub: buyer.id,  piUid: buyer.piUid,  username: buyer.username,  role: buyer.role });

const sellerAs = as(sellerToken);
const buyerAs  = as(buyerToken);

let listingId = "";
let escrowId  = "";

// ── [a] Health check ──────────────────────────────────────────────────────────

console.log("\n[a] Health check");
{
  const res = await request(app).get("/api/");
  assertStatus("GET /api/ → 200", res, 200);
  assert("/api/ status ok", res.body?.status === "ok", JSON.stringify(res.body));

  const res2 = await request(app).get("/api/healthz");
  assertStatus("GET /api/healthz → 200", res2, 200);
}

// ── [b] Unauthenticated guard → 401 ──────────────────────────────────────────

console.log("\n[b] Auth guard — no token → 401");
{
  const res = await request(app).get("/api/auth/me");
  assertStatus("GET /api/auth/me (no token) → 401", res, 401);
}

// ── [c] GET /auth/me (seller) ─────────────────────────────────────────────────

console.log("\n[c] GET /api/auth/me (seller)");
{
  const res = await sellerAs.get("/api/auth/me");
  assertStatus("GET /api/auth/me → 200", res, 200);
  assert(
    "seller username matches",
    res.body?.user?.username === "seller_alice",
    JSON.stringify(res.body),
  );
}

// ── [d] Seller creates a listing ──────────────────────────────────────────────

console.log("\n[d] POST /api/listings (seller creates listing)");
{
  const res = await sellerAs.post("/api/listings").send({
    title: "Vintage Pi Collectible",
    description: "A rare collectible from the Pi Network early days.",
    priceInPi: 5.5,
    category: "collectibles",
    condition: "good",
    productType: "physical",
    status: "active",
    country: "BS",
  });
  assertStatus("POST /api/listings → 201", res, 201);
  listingId = res.body?.listing?.id ?? "";
  assert("listingId present", !!listingId, JSON.stringify(res.body));
  assert(
    "listing title correct",
    res.body?.listing?.title === "Vintage Pi Collectible",
    res.body?.listing?.title as string,
  );
}

// ── [e] Invalid listing input → 400 ──────────────────────────────────────────

console.log("\n[e] Invalid listing input → 400");
{
  const res = await sellerAs.post("/api/listings").send({
    title: "",          // min 1 fails
    priceInPi: -1,      // nonnegative fails
    category: "x",
  });
  assertStatus("POST /api/listings (invalid) → 400", res, 400);
}

// ── [f] Buyer browses listings ────────────────────────────────────────────────

console.log("\n[f] GET /api/listings (buyer browses)");
{
  const res = await buyerAs.get("/api/listings");
  assertStatus("GET /api/listings → 200", res, 200);
  const ids: string[] = (res.body?.listings ?? []).map((l: { id: string }) => l.id);
  assert("new listing is visible", ids.includes(listingId), JSON.stringify(ids));
}

// ── [g] GET listing detail ────────────────────────────────────────────────────

console.log("\n[g] GET /api/listings/:id");
{
  const res = await request(app).get(`/api/listings/${listingId}`);
  assertStatus("GET /api/listings/:id → 200", res, 200);
  assert(
    "priceInPi correct",
    res.body?.listing?.priceInPi === 5.5,
    String(res.body?.listing?.priceInPi),
  );
}

// ── [h] Seller cannot buy own listing → 400 ──────────────────────────────────

console.log("\n[h] Seller self-purchase → 400");
{
  const res = await sellerAs.post("/api/escrow").send({ listingId });
  assertStatus("POST /api/escrow (self-purchase) → 400", res, 400);
}

// ── [i] Buyer creates escrow ──────────────────────────────────────────────────

console.log("\n[i] POST /api/escrow (buyer starts purchase)");
{
  const res = await buyerAs.post("/api/escrow").send({
    listingId,
    releaseType: "shipping",
  });
  assertStatus("POST /api/escrow → 201", res, 201);
  escrowId = res.body?.escrow?.id ?? "";
  assert("escrowId present", !!escrowId, JSON.stringify(res.body));
  assert("escrow status pending", res.body?.escrow?.status === "pending", res.body?.escrow?.status as string);
}

// ── [j] Fund escrow in pglite (bypass Pi payment API) ─────────────────────────
// /escrow/:id/approve and /escrow/:id/complete call the Pi Network API which
// is unavailable in this environment. Set status='funded' directly in pglite
// to simulate a successful on-chain payment, then test all post-funding steps.

console.log("\n[j] Fund escrow directly in pglite (Pi payment API bypass)");
{
  await db
    .update(escrowTransactions)
    .set({
      status: "funded",
      piPaymentId: "test-pi-payment-00001",
      piTxid: "test-pi-txid-00001",
      updatedAt: new Date(),
    })
    .where(eq(escrowTransactions.id, escrowId));

  const [row] = await db
    .select()
    .from(escrowTransactions)
    .where(eq(escrowTransactions.id, escrowId))
    .limit(1);
  assert("escrow now funded", row?.status === "funded", row?.status ?? "row not found");
}

// ── [k] Seller ships ──────────────────────────────────────────────────────────

console.log("\n[k] POST /api/escrow/:id/ship (seller ships)");
{
  const res = await sellerAs.post(`/api/escrow/${escrowId}/ship`).send({
    trackingNumber: "TRACK-12345",
    shippingCarrier: "GoPost BS",
  });
  assertStatus("POST /api/escrow/:id/ship → 200", res, 200);
  assert("escrow status shipped", res.body?.escrow?.status === "shipped", res.body?.escrow?.status as string);
}

// ── [l] Seller marks delivered ────────────────────────────────────────────────

console.log("\n[l] POST /api/escrow/:id/deliver (seller marks delivered)");
{
  const res = await sellerAs.post(`/api/escrow/${escrowId}/deliver`).send({});
  assertStatus("POST /api/escrow/:id/deliver → 200", res, 200);
  assert("escrow status delivered", res.body?.escrow?.status === "delivered", res.body?.escrow?.status as string);
}

// ── [m] Buyer confirms receipt → releases escrow ──────────────────────────────

console.log("\n[m] POST /api/escrow/:id/confirm (buyer confirms)");
{
  const res = await buyerAs.post(`/api/escrow/${escrowId}/confirm`).send({});
  assertStatus("POST /api/escrow/:id/confirm → 200", res, 200);
  assert("escrow status released", res.body?.escrow?.status === "released", res.body?.escrow?.status as string);
}

// ── [n] Buyer leaves a review ─────────────────────────────────────────────────

console.log("\n[n] POST /api/reviews (buyer reviews seller)");
{
  const res = await buyerAs.post("/api/reviews").send({
    escrowId,
    rating: 5,
    comment: "Fast shipping, great collectible!",
  });
  assertStatus("POST /api/reviews → 201", res, 201);
  assert("review rating 5", res.body?.review?.rating === 5, String(res.body?.review?.rating));
}

// ── [o] Duplicate review → 409 ───────────────────────────────────────────────

console.log("\n[o] Duplicate review → 409");
{
  const res = await buyerAs.post("/api/reviews").send({
    escrowId,
    rating: 3,
    comment: "Changed my mind",
  });
  assertStatus("POST /api/reviews (duplicate) → 409", res, 409);
}

// ── [p] GET unknown listing → 404 ────────────────────────────────────────────

console.log("\n[p] GET unknown listing → 404");
{
  const res = await request(app).get("/api/listings/00000000-0000-0000-0000-000000000000");
  assertStatus("GET /api/listings/:id (not found) → 404", res, 404);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("\n─────────────────────────────────────────────");
console.log(`PiBazaar E2E: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PASS ✓");
  process.exit(0);
}
