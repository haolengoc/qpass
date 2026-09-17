import { describe, expect, it } from "vitest";
import {
  getRequestIp,
  MemoryRegistrationLimiter
} from "@/lib/rate-limit/registration";

describe("registration rate limiting", () => {
  it("blocks requests over the limit and resets after the window", () => {
    let now = 1_000;
    const limiter = new MemoryRegistrationLimiter(2, 1_000, 10, () => now);

    expect(limiter.check("event:ip")).toBe(true);
    expect(limiter.check("event:ip")).toBe(true);
    expect(limiter.check("event:ip")).toBe(false);

    now += 1_000;
    expect(limiter.check("event:ip")).toBe(true);
  });

  it("keeps the local identifier cache bounded", () => {
    const limiter = new MemoryRegistrationLimiter(2, 60_000, 2, () => 1_000);

    expect(limiter.check("first")).toBe(true);
    expect(limiter.check("second")).toBe(true);
    expect(limiter.check("third")).toBe(true);
    expect(limiter.check("first")).toBe(true);
  });

  it("uses the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.2" }
    });

    expect(getRequestIp(request)).toBe("203.0.113.8");
  });
});
