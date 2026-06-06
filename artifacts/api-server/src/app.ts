import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { HttpError } from "./lib/http";
import { env } from "./lib/env";

const app: Express = express();

// ─── CORS ───────────────────────────────────────────────────────────────────
// When CORS_ORIGINS is set, only those origins may call the API with
// credentials; otherwise we reflect the request origin (Pi Browser sandbox +
// Replit preview both rotate origins, so a static allow-list is impractical in
// development).
//
// In production we want a locked-down allow-list, but we must NEVER crash the
// server on startup just because CORS_ORIGINS was not pasted into the Secrets
// tab. So we resolve the allow-list with a layered fallback:
//   1. CORS_ORIGINS (explicit, preferred).
//   2. The current Replit deployment domain(s) from REPLIT_DOMAINS, mapped to
//      https:// origins — this keeps the deployed web app working out of the box.
//   3. As a last resort, reflect the request origin (logged loudly) so the API
//      stays up rather than rejecting every request.
function resolveAllowedOrigins(): string[] {
  if (env.CORS_ORIGINS.length > 0) return env.CORS_ORIGINS;

  const deploymentOrigins = (process.env.REPLIT_DOMAINS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean)
    .map((host) => `https://${host}`);

  if (deploymentOrigins.length > 0) {
    logger.warn(
      { deploymentOrigins },
      "CORS_ORIGINS is not set — falling back to the current Replit deployment " +
        "domain(s). Set CORS_ORIGINS in the Secrets tab to lock this down.",
    );
    return deploymentOrigins;
  }

  return [];
}

const allowedOrigins = resolveAllowedOrigins();
if (env.isProduction && allowedOrigins.length === 0) {
  logger.warn(
    "CORS_ORIGINS is not set and no REPLIT_DOMAINS deployment domain was found. " +
      "Reflecting the request origin so the API stays up — set CORS_ORIGINS " +
      "(e.g. https://P2PbazaarMarketplace.replit.app) to lock this down.",
  );
}
app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  }),
);

// ─── Pi Browser framing ───────────────────────────────────────────────────────
// The app is embedded inside the Pi Browser sandbox. Allow it to be framed by
// Pi domains via CSP frame-ancestors and make sure no X-Frame-Options: DENY is
// emitted, which would otherwise block rendering inside the sandbox.
app.use((_req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://*.minepi.com https://*.pi https://*.replit.app https://*.replit.dev",
  );
  res.removeHeader("X-Frame-Options");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

// Centralised error handler — converts thrown errors into JSON responses.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    res.status(400).json({ error: "Invalid request payload" });
    return;
  }
  req.log.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
