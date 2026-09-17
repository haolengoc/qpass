import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export const APP_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function formatEventDate(value: Date | string) {
  return formatInTimeZone(value, APP_TIME_ZONE, "dd/MM/yyyy, HH:mm");
}

export function toDateTimeLocal(value: Date | string) {
  return formatInTimeZone(value, APP_TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
}

export function fromDateTimeLocal(value: string) {
  return fromZonedTime(value, APP_TIME_ZONE).toISOString();
}

