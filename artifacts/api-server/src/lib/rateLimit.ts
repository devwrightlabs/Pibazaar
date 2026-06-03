import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory fixed-window rate limiter keyed by client IP.
 * Suitable for a single-instance deployment.
 */
export function rateLimit({
  windowMs,
  max,
}: {
  windowMs: number;
  max: number;
}) {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil((bucket.resetAt - now) / 1000)),
      );
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
