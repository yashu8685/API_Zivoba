import { sign, verify } from "hono/jwt";

export type JwtPayload = {
  sub: number; // user id
  role: "superadmin" | "user";
  iat?: number;
  exp?: number;
};

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env");
  }
  return secret;
}

function expiryToSeconds(expiresIn: string): number {
  const m = /^(\d+)([smhd])$/.exec(expiresIn.trim());
  if (!m) return 7 * 24 * 3600; // default 7d
  const n = Number(m[1]);
  const unit = m[2];
  if (unit === "s") return n;
  if (unit === "m") return n * 60;
  if (unit === "h") return n * 3600;
  return n * 86400;
}

export async function signToken(userId: number, role: "superadmin" | "user"): Promise<string> {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN ?? "7d";
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: userId,
    role,
    iat: now,
    exp: now + expiryToSeconds(expiresIn),
  };
  return sign(payload, secret, "HS256");
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const secret = getJwtSecret();
  return (await verify(token, secret, "HS256")) as unknown as JwtPayload;
}
