import { getServerSession } from "next-auth";
import { AppError } from "@/lib/errors/app-error";
import { authOptions } from "./options";
import { prisma } from "@/lib/db/prisma";
import { isStaff } from "./access";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true }
  });
}

export async function requireAccount() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Bạn cần đăng nhập.", 401);
  }
  return user;
}

// All existing admin pages and API handlers use this guard.
export async function requireUser() {
  const user = await requireAccount();
  if (!isStaff(user.role)) {
    throw new AppError("FORBIDDEN", "Trang quản trị chỉ dành cho ban tổ chức.", 403);
  }
  return user;
}
