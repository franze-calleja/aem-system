// In-memory sliding-window rate limiter, keyed by an arbitrary string (typically
// IP address for login throttling). Suitable for single-process Node deployments
// — for multi-instance prod this needs swapping for a Redis-backed implementation
// (Upstash / @upstash/ratelimit is the usual choice).
//
// Window semantics: `limit` events allowed per `windowSec` per key. The window
// slides on each new attempt — old timestamps are pruned per request.

type WindowEntry = {
  hits: number[];
};

const buckets = new Map<string, WindowEntry>();
let lastSweep = Date.now();

const SWEEP_INTERVAL_MS = 60_000; // prune stale keys at most once a minute

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
): RateLimitResult {
  const now = Date.now();
  const windowMs = opts.windowSec * 1000;
  const cutoff = now - windowMs;

  // Opportunistic prune so the map doesn't grow unboundedly under attack.
  if (now - lastSweep > SWEEP_INTERVAL_MS) {
    sweep(now);
    lastSweep = now;
  }

  const entry = buckets.get(key) ?? { hits: [] };
  // Drop expired timestamps from this bucket.
  entry.hits = entry.hits.filter((t) => t > cutoff);

  if (entry.hits.length >= opts.limit) {
    // Oldest in-window hit determines when the next slot frees.
    const oldest = entry.hits[0];
    const retryAfterMs = oldest + windowMs - now;
    buckets.set(key, entry);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  entry.hits.push(now);
  buckets.set(key, entry);
  return { ok: true, remaining: opts.limit - entry.hits.length };
}

// Reset a key. Useful after a successful login (give the user a clean slate
// once they prove they're not the attacker).
export function rateLimitReset(key: string) {
  buckets.delete(key);
}

function sweep(now: number) {
  // Drop any bucket whose newest hit is more than 1h old — well past any
  // practical window we use. Cheap insurance against memory growth.
  const horizon = now - 3600_000;
  for (const [k, v] of buckets) {
    const newest = v.hits[v.hits.length - 1] ?? 0;
    if (newest < horizon) buckets.delete(k);
  }
}

// Extract a best-effort client IP from request headers. Uses standard proxy
// headers first; falls back to a constant string so anonymous calls still
// share a bucket (rather than every call getting its own empty bucket).
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for can be a comma-separated list; the client IP is the leftmost.
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
