import { notFound } from "next/navigation";
import { isAppError } from "@/lib/errors/app-error";

export async function eventOrNotFound<T>(load: () => Promise<T>) {
  try {
    return await load();
  } catch (error) {
    if (isAppError(error) && error.code === "EVENT_NOT_FOUND") notFound();
    throw error;
  }
}
