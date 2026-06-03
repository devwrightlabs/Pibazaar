import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, users } from "@workspace/db";
import { asyncHandler, HttpError } from "../lib/http";
import { hashPassword, verifyPassword } from "../lib/password";
import { signAuthToken } from "../lib/jwt";
import { verifyPiToken, PiApiError } from "../lib/pi";
import { rateLimit } from "../lib/rateLimit";
import { serializeSelf } from "../lib/serialize";
import { optionalAuth, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const authLimiter = rateLimit({ windowMs: 60_000, max: 20 });

function tokenFor(user: typeof users.$inferSelect): string {
  return signAuthToken({
    sub: user.id,
    piUid: user.piUid,
    username: user.username,
    role: user.role,
  });
}

async function generateUniqueUsername(base: string): Promise<string> {
  const clean = (base || "Pioneer").trim().slice(0, 30) || "Pioneer";
  let candidate = clean;
  for (let i = 0; i < 50; i++) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);
    if (!existing) return candidate;
    candidate = `${clean}_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  return `${clean}_${Date.now()}`;
}

// ─── Manual Sign Up (step 1: no Pi SDK involved) ──────────────────────────────

const signupSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, "Use letters, numbers, _ or ."),
  password: z.string().min(8).max(128),
  email: z.string().email().optional(),
});

router.post(
  "/auth/signup",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }
    const { username, password, email } = parsed.data;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (existing) throw new HttpError(409, "Username is already taken");

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ username, passwordHash, email: email ?? null })
      .returning();

    res.status(201).json({ token: tokenFor(user), user: serializeSelf(user) });
  }),
);

// ─── Manual Log In (username + password) ──────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post(
  "/auth/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Invalid credentials");
    const { username, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    if (!user || !user.passwordHash) {
      throw new HttpError(401, "Invalid username or password");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Invalid username or password");
    if (user.isSuspended) throw new HttpError(403, "Account suspended");

    res.json({ token: tokenFor(user), user: serializeSelf(user) });
  }),
);

// ─── Pi Log In (step 2: returning users via Pi SDK) ───────────────────────────

const piSchema = z.object({
  accessToken: z.string().min(1),
  walletAddress: z.string().optional(),
});

router.post(
  "/auth/pi",
  authLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const parsed = piSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Missing accessToken");
    const { accessToken, walletAddress } = parsed.data;

    let piUser;
    try {
      piUser = await verifyPiToken(accessToken);
    } catch (err) {
      if (err instanceof PiApiError) throw new HttpError(err.status, err.message);
      throw err;
    }

    const [byPiUid] = await db
      .select()
      .from(users)
      .where(eq(users.piUid, piUser.uid))
      .limit(1);

    let user: typeof users.$inferSelect;
    let isNewUser = false;

    if (req.user) {
      // Linking mode (step 2 of two-step auth): a manually-signed-up user is
      // attaching their Pi identity. The Pi account must not already belong to
      // a different user.
      if (byPiUid && byPiUid.id !== req.user.id) {
        throw new HttpError(409, "This Pi account is already linked to another user");
      }
      [user] = await db
        .update(users)
        .set({
          piUid: piUser.uid,
          walletAddress: walletAddress ?? req.user.walletAddress,
          piWalletAddress: walletAddress ?? req.user.piWalletAddress,
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user.id))
        .returning();
    } else if (byPiUid) {
      // Returning Pi user logging in.
      if (byPiUid.isSuspended) throw new HttpError(403, "Account suspended");
      [user] = await db
        .update(users)
        .set({
          walletAddress: walletAddress ?? byPiUid.walletAddress,
          piWalletAddress: walletAddress ?? byPiUid.piWalletAddress,
          isVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byPiUid.id))
        .returning();
    } else {
      // First-time Pi sign-in with no prior manual account: provision one.
      isNewUser = true;
      const username = await generateUniqueUsername(piUser.username);
      [user] = await db
        .insert(users)
        .values({
          piUid: piUser.uid,
          username,
          walletAddress: walletAddress ?? null,
          piWalletAddress: walletAddress ?? null,
          isVerified: true,
        })
        .returning();
    }

    res.json({ token: tokenFor(user), isNewUser, user: serializeSelf(user) });
  }),
);

// ─── Current session ──────────────────────────────────────────────────────────

router.post("/auth/logout", (_req, res) => {
  res.clearCookie("token");
  res.json({ ok: true });
});

router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.id))
      .limit(1);
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: serializeSelf(user) });
  }),
);

export default router;
