import { randomBytes } from "node:crypto";

export const QR_CODE_TTL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function createQrCodeToken(now = new Date()) {
  return {
    token: randomBytes(32).toString("base64url"),
    generatedAt: now,
    expiresAt: new Date(now.getTime() + QR_CODE_TTL_DAYS * DAY_MS),
  };
}

export function isQrCodeUsable(
  qrCode: { active: boolean; expiresAt: Date | null } | null | undefined,
  now = new Date(),
) {
  return Boolean(
    qrCode?.active && qrCode.expiresAt && qrCode.expiresAt.getTime() > now.getTime(),
  );
}

export function isQrCodeTokenFormatValid(token: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}
