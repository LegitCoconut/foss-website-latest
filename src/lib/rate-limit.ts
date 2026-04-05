/**
 * In-memory sliding window rate limiter.
 *
 * Usage in API routes:
 *   const limiter = rateLimit({ interval: 60_000, limit: 10 });
 *   // in handler:
 *   const { success } = await limiter.check(identifier);
 *   if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface RateLimitEntry {
    timestamps: number[];
}

interface RateLimitOptions {
    /** Window size in milliseconds */
    interval: number;
    /** Max requests per window */
    limit: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// Cleanup stale entries every 60 seconds
let cleanupScheduled = false;
function scheduleCleanup() {
    if (cleanupScheduled) return;
    cleanupScheduled = true;
    setInterval(() => {
        const now = Date.now();
        for (const [, store] of stores) {
            for (const [key, entry] of store) {
                entry.timestamps = entry.timestamps.filter((t) => now - t < 300_000);
                if (entry.timestamps.length === 0) store.delete(key);
            }
        }
    }, 60_000).unref();
}

export function rateLimit(options: RateLimitOptions) {
    const storeKey = `${options.interval}:${options.limit}`;
    if (!stores.has(storeKey)) {
        stores.set(storeKey, new Map());
    }
    const store = stores.get(storeKey)!;
    scheduleCleanup();

    return {
        check(identifier: string): { success: boolean; remaining: number; reset: number } {
            const now = Date.now();
            const windowStart = now - options.interval;

            let entry = store.get(identifier);
            if (!entry) {
                entry = { timestamps: [] };
                store.set(identifier, entry);
            }

            // Remove timestamps outside current window
            entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

            if (entry.timestamps.length >= options.limit) {
                const oldestInWindow = entry.timestamps[0];
                return {
                    success: false,
                    remaining: 0,
                    reset: Math.ceil((oldestInWindow + options.interval - now) / 1000),
                };
            }

            entry.timestamps.push(now);
            return {
                success: true,
                remaining: options.limit - entry.timestamps.length,
                reset: Math.ceil(options.interval / 1000),
            };
        },
    };
}

/**
 * Extract client IP from request headers.
 * Normalizes IPv6-mapped IPv4 addresses.
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const raw = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
    return raw.startsWith("::ffff:") ? raw.slice(7) : raw;
}

/**
 * Helper: returns a 429 response with rate limit headers and reset info.
 */
export function rateLimitResponse(reset: number) {
    return new Response(
        JSON.stringify({
            error: "Too many requests. Please try again later.",
            reset,
            redirectUrl: `/rate-limited?reset=${reset}`,
        }),
        {
            status: 429,
            headers: {
                "Content-Type": "application/json",
                "Retry-After": String(reset),
            },
        }
    );
}