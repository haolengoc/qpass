import type { EventStatus } from "@prisma/client";

export type DerivedEventState =
  | "CANCELLED"
  | "DRAFT"
  | "COMPLETED"
  | "ONGOING"
  | "NOT_OPEN_YET"
  | "OPEN"
  | "FULL"
  | "CLOSED";

export type EventStateInput = {
  status: EventStatus;
  startTime: Date;
  endTime: Date;
  registrationOpenAt: Date;
  registrationCloseAt: Date;
  capacity: number | null;
  activeRegistrationCount: number;
  now?: Date;
};

export function deriveEventState(input: EventStateInput): DerivedEventState {
  const now = input.now ?? new Date();

  if (input.status === "CANCELLED") return "CANCELLED";
  if (input.status === "DRAFT") return "DRAFT";
  if (now > input.endTime) return "COMPLETED";
  if (input.startTime <= now && now <= input.endTime) return "ONGOING";
  if (now < input.registrationOpenAt) return "NOT_OPEN_YET";

  const isFull =
    input.capacity !== null && input.activeRegistrationCount >= input.capacity;
  if (isFull) return "FULL";

  if (input.registrationOpenAt <= now && now <= input.registrationCloseAt) {
    return "OPEN";
  }

  return "CLOSED";
}

export function isWithinWindow(now: Date, openAt: Date, closeAt: Date) {
  return openAt <= now && now <= closeAt;
}
