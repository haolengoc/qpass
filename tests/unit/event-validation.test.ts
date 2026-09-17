import { describe, expect, it } from "vitest";
import { eventInputSchema } from "@/lib/validation/event";

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ngày hội Công nghệ 2026",
    slug: "ngay-hoi-cong-nghe-2026",
    description: null,
    location: "Cơ sở B",
    startTime: "2026-10-20T02:00:00.000Z",
    endTime: "2026-10-20T05:00:00.000Z",
    registrationOpenAt: "2026-10-01T02:00:00.000Z",
    registrationCloseAt: "2026-10-19T16:00:00.000Z",
    capacity: 200,
    codePrefix: "ctd26",
    collectPhone: true,
    requirePhone: false,
    collectFaculty: true,
    requireFaculty: true,
    fields: [],
    ...overrides
  };
}

describe("event validation", () => {
  it("normalizes the code prefix and supplies the default check-in window", () => {
    const event = eventInputSchema.parse(validEvent());

    expect(event.codePrefix).toBe("CTD26");
    expect(event.checkinOpenAt).toBe("2026-10-20T01:30:00.000Z");
    expect(event.checkinCloseAt).toBe(event.endTime);
  });

  it("rejects an invalid event and registration timeline", () => {
    const result = eventInputSchema.safeParse(
      validEvent({
        endTime: "2026-10-20T01:00:00.000Z",
        registrationCloseAt: "2026-10-20T03:00:00.000Z"
      })
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["endTime", "registrationCloseAt"])
      );
    }
  });

  it("rejects non-positive capacity and invalid code prefixes", () => {
    expect(eventInputSchema.safeParse(validEvent({ capacity: 0 })).success).toBe(false);
    expect(eventInputSchema.safeParse(validEvent({ codePrefix: "A-1" })).success).toBe(false);
  });

  it("requires unique options for choice fields", () => {
    const result = eventInputSchema.safeParse(
      validEvent({
        fields: [
          {
            label: "Kích cỡ áo",
            fieldKey: "shirt_size",
            type: "SELECT",
            required: true,
            options: ["M", "m"],
            order: 0,
            isActive: true
          }
        ]
      })
    );

    expect(result.success).toBe(false);
  });

  it("rejects duplicate custom field keys", () => {
    const fields = ["one", "two"].map((label) => ({
      label,
      fieldKey: "same_key",
      type: "TEXT",
      required: false,
      options: [],
      order: 0,
      isActive: true
    }));

    expect(eventInputSchema.safeParse(validEvent({ fields })).success).toBe(false);
  });
});

