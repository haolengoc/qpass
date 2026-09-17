import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import { assertCheckinAllowed } from "@/services/checkin.service";

const openAt = new Date("2026-09-15T01:00:00.000Z");
const closeAt = new Date("2026-09-15T05:00:00.000Z");

function rules(overrides: Record<string, unknown> = {}) {
  return {
    eventStatus: "PUBLISHED" as const,
    registrationStatus: "REGISTERED" as const,
    checkinOpenAt: openAt,
    checkinCloseAt: closeAt,
    now: new Date("2026-09-15T03:00:00.000Z"),
    ...overrides
  };
}

describe("check-in rules", () => {
  it("allows an active registration inside the inclusive window", () => {
    expect(() => assertCheckinAllowed(rules())).not.toThrow();
    expect(() => assertCheckinAllowed(rules({ now: openAt }))).not.toThrow();
    expect(() => assertCheckinAllowed(rules({ now: closeAt }))).not.toThrow();
  });

  it("rejects check-in outside the configured window", () => {
    expect(() =>
      assertCheckinAllowed(rules({ now: new Date("2026-09-15T00:59:59.000Z") }))
    ).toThrowError(expect.objectContaining({ code: "CHECKIN_NOT_OPEN" }));
  });

  it("rejects cancelled events and registrations", () => {
    for (const input of [
      rules({ eventStatus: "CANCELLED" }),
      rules({ registrationStatus: "CANCELLED" })
    ]) {
      try {
        assertCheckinAllowed(input);
        throw new Error("Expected check-in to be rejected.");
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
      }
    }
  });
});

