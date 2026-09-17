import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

const bootstrapAdminEnvironmentSchema = z
  .object({
    DIRECT_URL: z.string().url(),
    BOOTSTRAP_ADMIN_NAME: z.string().trim().min(2).max(100),
    BOOTSTRAP_ADMIN_EMAIL: z
      .string()
      .trim()
      .email()
      .transform((email) => email.toLowerCase()),
    BOOTSTRAP_ADMIN_PASSWORD: z
      .string()
      .min(14)
      .max(128)
      .regex(/[a-z]/, "must contain a lowercase letter")
      .regex(/[A-Z]/, "must contain an uppercase letter")
      .regex(/[0-9]/, "must contain a number")
      .regex(/[^A-Za-z0-9]/, "must contain a special character")
  })
  .superRefine((environment, context) => {
    if (environment.BOOTSTRAP_ADMIN_EMAIL.endsWith("@example.test")) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOOTSTRAP_ADMIN_EMAIL"],
        message: "development email domains cannot be used"
      });
    }

    if (environment.BOOTSTRAP_ADMIN_PASSWORD === "ChangeMeAdmin123!") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["BOOTSTRAP_ADMIN_PASSWORD"],
        message: "the development password cannot be used"
      });
    }
  });

export type BootstrapAdminConfig = z.infer<
  typeof bootstrapAdminEnvironmentSchema
>;

export function parseBootstrapAdminEnvironment(
  environment: Record<string, string | undefined>
) {
  const parsed = bootstrapAdminEnvironmentSchema.safeParse(environment);
  if (parsed.success) return parsed.data;

  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid admin bootstrap environment: ${details}`);
}

export async function createBootstrapAdmin(
  prisma: PrismaClient,
  config: BootstrapAdminConfig
) {
  const existingUser = await prisma.user.findUnique({
    where: { email: config.BOOTSTRAP_ADMIN_EMAIL },
    select: { id: true }
  });

  if (existingUser) {
    throw new Error(
      `User ${config.BOOTSTRAP_ADMIN_EMAIL} already exists. No changes were made.`
    );
  }

  const passwordHash = await bcrypt.hash(config.BOOTSTRAP_ADMIN_PASSWORD, 12);
  return prisma.user.create({
    data: {
      name: config.BOOTSTRAP_ADMIN_NAME,
      email: config.BOOTSTRAP_ADMIN_EMAIL,
      passwordHash,
      role: "ADMIN"
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true
    }
  });
}
