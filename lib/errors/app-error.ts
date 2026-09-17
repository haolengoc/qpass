export const ERROR_CODES = [
  "EVENT_NOT_FOUND",
  "EVENT_CANCELLED",
  "REGISTRATION_NOT_OPEN",
  "REGISTRATION_CLOSED",
  "EVENT_FULL",
  "DUPLICATE_STUDENT",
  "DUPLICATE_EMAIL",
  "VALIDATION_ERROR",
  "INVALID_QR",
  "WRONG_EVENT",
  "ALREADY_CHECKED_IN",
  "CHECKIN_NOT_OPEN",
  "REGISTRATION_CANCELLED",
  "REGISTRATION_NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "RATE_LIMITED",
  "INTERNAL_ERROR"
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status = 400
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
