import jwt from "jsonwebtoken";
import { env } from "./env";

export interface AuthTokenPayload {
  sub: string; // internal users.id (UUID)
  piUid: string | null;
  username: string;
  role: "user" | "admin";
}

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: TOKEN_TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof decoded === "string") return null;
    const { sub, piUid, username, role } = decoded as Record<string, unknown>;
    if (typeof sub !== "string" || typeof username !== "string") return null;
    return {
      sub,
      username,
      piUid: typeof piUid === "string" ? piUid : null,
      role: role === "admin" ? "admin" : "user",
    };
  } catch {
    return null;
  }
}
