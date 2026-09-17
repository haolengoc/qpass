import { describe, expect, it } from "vitest";
import { loginDestination } from "@/lib/auth/access";

describe("login destinations", () => {
  it("opens the workspace for the signed-in role", () => {
    expect(loginDestination(null, "PARTICIPANT")).toBe("/events");
    expect(loginDestination(null, "ORGANIZER")).toBe("/admin/events");
    expect(loginDestination(null, "ADMIN")).toBe("/admin/events");
  });

  it("preserves event registration and admin deep links", () => {
    expect(loginDestination("/events/workshop/register", "PARTICIPANT")).toBe("/events/workshop/register");
    expect(loginDestination("/events?view=registered", "PARTICIPANT")).toBe("/events?view=registered");
    expect(loginDestination("/admin/events/new", "ORGANIZER")).toBe("/admin/events/new");
  });

  it("prevents external redirects, wrong-role pages and login loops", () => {
    for (const path of [["/events", "/admin"], "https://example.com", "//example.com", "/\\example.com", "/login", "/signup", "/admin/events", "/events/../login"]) {
      expect(loginDestination(path, "PARTICIPANT")).toBe("/events");
    }
    for (const path of ["/", "/events", "/admin/login?callbackUrl=/admin/login", "/admin/../login"]) {
      expect(loginDestination(path, "ORGANIZER")).toBe("/admin/events");
    }
  });
});
