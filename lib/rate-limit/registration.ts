import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { AppError } from "@/lib/errors/app-error";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const MAX_LOCAL_IDENTIFIERS = 10_000;

type Clock = () => number;

export class MemoryRegistrationLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly limit = MAX_REQUESTS,
    private readonly windowMs = WINDOW_MS,
    private readonly maxIdentifiers = MAX_LOCAL_IDENTIFIERS,
    private readonly now: Clock = Date.now
  ) {}

  check(identifier: string) {
    const now = this.now();
    const recent = (this.hits.get(identifier) ?? []).filter(
      (timestamp) => now - timestamp < this.windowMs
    );

    if (recent.length >= this.limit) return false;

    if (!this.hits.has(identifier) && this.hits.size >= this.maxIdentifiers) {
      const oldestIdentifier = this.hits.keys().next().value as string | undefined;
      if (oldestIdentifier) this.hits.delete(oldestIdentifier);
    }

    recent.push(now);
    this.hits.delete(identifier);
    this.hits.set(identifier, recent);
    return true;
  }
}

const localLimiter = new MemoryRegistrationLimiter();
let warnedAboutLocalLimiter = false;

function createRemoteLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (Boolean(url) !== Boolean(token)) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together."
    );
  }

  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, "1 m"),
    prefix: "registration"
  });
}

const remoteLimiter = createRemoteLimiter();

export function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function rateLimitedError() {
  return new AppError(
    "RATE_LIMITED",
    "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
    429
  );
}

export async function enforceRegistrationRateLimit(identifier: string) {
  if (remoteLimiter) {
    const result = await remoteLimiter.limit(identifier);
    if (!result.success) throw rateLimitedError();
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new AppError(
      "INTERNAL_ERROR",
      "Đăng ký đang tạm thời không khả dụng.",
      503
    );
  }

  if (!warnedAboutLocalLimiter) {
    console.warn("Registration rate limiting is using the in-memory development fallback.");
    warnedAboutLocalLimiter = true;
  }

  if (!localLimiter.check(identifier)) throw rateLimitedError();
}
