function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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
};
