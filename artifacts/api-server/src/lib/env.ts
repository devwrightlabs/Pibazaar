function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Normalised deployment stage. Driven by APP_ENV, falling back to NODE_ENV. */
function resolveAppEnv(): "production" | "staging" | "development" {
  const raw = (process.env.APP_ENV ?? process.env.NODE_ENV ?? "development")
    .trim()
    .toLowerCase();
  if (raw === "production" || raw === "prod") return "production";
  if (raw === "staging" || raw === "stage") return "staging";
  return "development";
}

export const env = {
  get JWT_SECRET(): string {
    return required("JWT_SECRET");
  },
  // PI_API_KEY is only required for Pi payment server-to-server calls
  // (approve/complete). It is read lazily so the server can boot without it.
  get PI_API_KEY(): string | undefined {
    return process.env.PI_API_KEY;
  },
  /** "production" | "staging" | "development" — used for env-specific behaviour. */
  get APP_ENV(): "production" | "staging" | "development" {
    return resolveAppEnv();
  },
  get isProduction(): boolean {
    return resolveAppEnv() === "production";
  },
  /**
   * Comma-separated list of browser origins allowed to call the API with
   * credentials. When empty, all origins are reflected (handy for the Pi
   * Browser sandbox + Replit preview). Set CORS_ORIGINS in production to lock
   * this down, e.g. "https://P2PbazaarMarketplace.replit.app".
   */
  get CORS_ORIGINS(): string[] {
    return (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  },
};
