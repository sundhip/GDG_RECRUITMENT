import crypto from "crypto";

const SECRET = process.env.BETTER_AUTH_SECRET || "development_secret_recruitment_portal_key_2026_safe_local";

export function createSessionToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      user,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return payload + "." + signature;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  if (signature !== expectedSignature) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) return null;
    return data.user || null;
  } catch (err) {
    return null;
  }
}
