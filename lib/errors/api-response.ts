import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, isAppError } from "./app-error";

export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, init);
}

export function fail(error: AppError) {
  return NextResponse.json<ApiFailure>(
    {
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    },
    { status: error.status }
  );
}

export function handleRouteError(error: unknown) {
  if (isAppError(error)) {
    return fail(error);
  }

  if (error instanceof ZodError) {
    return fail(
      new AppError(
        "VALIDATION_ERROR",
        error.issues[0]?.message ?? "Dữ liệu không hợp lệ.",
        422
      )
    );
  }

  console.error("Unhandled route error", error);
  return fail(new AppError("INTERNAL_ERROR", "Đã xảy ra lỗi hệ thống.", 500));
}
