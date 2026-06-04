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
// development). In production we refuse to reflect all origins: CORS_ORIGINS
// must be set explicitly, otherwise the server fails fast at startup.
const allowedOrigins = env.CORS_ORIGINS;
if (env.isProduction && allowedOrigins.length === 0) {
  throw new Error(
    "CORS_ORIGINS must be set in production (e.g. https://P2PbazaarMarketplace.replit.app). " +
      "Refusing to start with an open, credentialed CORS policy.",
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
