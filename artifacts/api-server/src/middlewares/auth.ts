import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, users, type PublicUser } from "@workspace/db";
import { verifyAuthToken } from "../lib/jwt";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  const cookieToken = (req as Request & { cookies?: Record<string, string> })
    .cookies?.token;
  return cookieToken ?? null;
}

async function loadUser(req: Request): Promise<PublicUser | null> {
  const token = extractToken(req);
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);
  if (!row) return null;
  // Pi-only app: User === PublicUser (no password field to strip).
  return row;
}

/** Require a valid token; 401 otherwise. Also blocks suspended accounts. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await loadUser(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.isSuspended) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attach req.user if a valid token is present; never blocks. */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await loadUser(req);
    if (user && !user.isSuspended) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Require an admin role; assumes requireAuth ran first. */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
