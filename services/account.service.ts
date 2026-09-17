import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự.").max(100),
  email: z.string().trim().email("Email không hợp lệ.").max(254).transform(value => value.toLowerCase()),
  password: z.string().min(6, "Mật khẩu cần ít nhất 6 ký tự.").refine(
    value => Buffer.byteLength(value, "utf8") <= 72,
    "Mật khẩu không được vượt quá 72 byte."
  )
});

export async function createParticipant(rawInput: unknown) {
  const input = signupSchema.parse(rawInput);
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    return await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: "PARTICIPANT" },
      select: { id: true }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError("DUPLICATE_EMAIL", "Email đã được sử dụng. Vui lòng đăng nhập.", 409);
    }
    throw error;
  }
}
