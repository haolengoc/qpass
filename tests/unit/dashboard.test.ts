import { describe, expect, it } from "vitest";
import { buildDailyTrend } from "@/services/dashboard.service";

describe("dashboard trends", () => {
  it("groups timestamps by Vietnam calendar day and fills empty days", () => {
    const trend = buildDailyTrend(
      [
        new Date("2026-09-13T17:30:00.000Z"),
        new Date("2026-09-14T02:00:00.000Z"),
        new Date("2026-09-15T02:00:00.000Z")
      ],
      new Date("2026-09-15T05:00:00.000Z"),
      3
    );

    expect(trend).toEqual([
      { date: "2026-09-13", count: 0 },
      { date: "2026-09-14", count: 2 },
      { date: "2026-09-15", count: 1 }
    ]);
  });
});

