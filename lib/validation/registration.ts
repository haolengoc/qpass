import { z } from "zod";
import { normalizeEmail, normalizeStudentId } from "@/lib/utils/normalize";

export const registrationInputSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự.").max(150),
  studentId: z
    .string()
    .transform(normalizeStudentId)
    .pipe(z.string().min(4, "MSSV không hợp lệ.").max(30)),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().email("Email không hợp lệ.").max(254)),
  phone: z.string().trim().max(30).nullable().optional(),
  faculty: z.string().trim().max(150).nullable().optional(),
  answers: z.record(z.unknown()).default({})
});

export type RegistrationInput = z.infer<typeof registrationInputSchema>;

