const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type Attempt = { failures: number; resetAt: number };

const globalAttempts = globalThis as unknown as {
  loginAttempts?: Map<string, Attempt>;
};

const attempts = globalAttempts.loginAttempts ?? new Map<string, Attempt>();
globalAttempts.loginAttempts = attempts;

function keyFor(email: string, ip: string) {
  return `${email.trim().toLowerCase()}|${ip || "unknown"}`;
}

export function loginRateLimit(email: string, ip: string) {
  const key = keyFor(email, ip);
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt <= now) {
    attempts.delete(key);
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return {
    blocked: current.failures >= MAX_FAILURES,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function registerLoginFailure(email: string, ip: string) {
  const key = keyFor(email, ip);
  const now = Date.now();
  const current = attempts.get(key);
  attempts.set(
    key,
    !current || current.resetAt <= now
      ? { failures: 1, resetAt: now + WINDOW_MS }
      : { ...current, failures: current.failures + 1 },
  );
}

export function clearLoginFailures(email: string, ip: string) {
  attempts.delete(keyFor(email, ip));
}
