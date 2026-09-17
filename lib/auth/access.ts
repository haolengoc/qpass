import type { Route } from "next";

export function isStaff(role: string | undefined) {
  return role === "ADMIN" || role === "ORGANIZER";
}

export function safeCallback(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x1f]/.test(value)) {
    return fallback;
  }
  return value;
}

export function accountHome(role: string) {
  return isStaff(role) ? "/admin/events" : "/events";
}

export function loginDestination(value: unknown, role: string) {
  const fallback = accountHome(role);
  const candidate = safeCallback(value, fallback);
  const path = new URL(candidate, "http://localhost").pathname;
  if (isStaff(role)) {
    return (path === "/admin" || path.startsWith("/admin/")) && path !== "/admin/login"
      ? candidate as Route : fallback;
  }
  return path === "/events" || path.startsWith("/events/") ? candidate as Route : fallback;
}
