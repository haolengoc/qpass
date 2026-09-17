import { describe, expect, it } from "vitest";
import { deriveEventState } from "@/lib/time/event-state";
import { sanitizeSpreadsheetCell } from "@/lib/export/sanitize";
import { hashQrToken } from "@/lib/qr/token";
import { normalizeEmail, normalizeStudentId } from "@/lib/utils/normalize";

describe("foundation utilities", () => {
  it("normalizes email and student id", () => {
    expect(normalizeEmail(" Student@ST.UEH.EDU.VN ")).toBe(
      "student@st.ueh.edu.vn"
    );
    expect(normalizeStudentId(" 31241000001 ")).toBe("31241000001");
  });

  it("hashes QR tokens deterministically without returning the raw token", () => {
    const hash = hashQrToken("opaque-token");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("opaque-token");
    expect(hash).toBe(hashQrToken("opaque-token"));
  });

  it("prefixes dangerous spreadsheet formulas", () => {
    expect(sanitizeSpreadsheetCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(sanitizeSpreadsheetCell("@cmd")).toBe("'@cmd");
    expect(sanitizeSpreadsheetCell("normal")).toBe("normal");
  });

  it("derives event state with full taking priority over open", () => {
    const now = new Date("2026-09-14T02:00:00.000Z");
    expect(
      deriveEventState({
        status: "PUBLISHED",
        startTime: new Date("2026-09-15T02:00:00.000Z"),
        endTime: new Date("2026-09-15T05:00:00.000Z"),
        registrationOpenAt: new Date("2026-09-13T02:00:00.000Z"),
        registrationCloseAt: new Date("2026-09-15T01:00:00.000Z"),
        capacity: 10,
        activeRegistrationCount: 10,
        now
      })
    ).toBe("FULL");
  });
});
