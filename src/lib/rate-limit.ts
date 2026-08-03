type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

// Nettoyage périodique pour éviter une fuite mémoire
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt < now) buckets.delete(key);
  }
}, 60_000);

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = buckets.get(identifier);

  if (!entry || entry.resetAt < now) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
