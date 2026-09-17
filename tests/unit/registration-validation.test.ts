import { describe, expect, it } from "vitest";
import { registrationInputSchema } from "@/lib/validation/registration";

describe("registration validation", () => {
  it("normalizes student id and email", () => {
    const registration = registrationInputSchema.parse({
      fullName: " Nguyễn Văn A ",
      studentId: " 31241000099 ",
      email: " STUDENT@EXAMPLE.TEST ",
      answers: {}
    });

    expect(registration.fullName).toBe("Nguyễn Văn A");
    expect(registration.studentId).toBe("31241000099");
    expect(registration.email).toBe("student@example.test");
  });

  it("rejects malformed core fields", () => {
    const result = registrationInputSchema.safeParse({
      fullName: "A",
      studentId: "1",
      email: "not-an-email"
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path[0])).toEqual(
        expect.arrayContaining(["fullName", "studentId", "email"])
      );
    }
  });
});

