import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));
const optionalString = z.string().optional().or(z.literal(""));

const serverEnvSchema = z
  .object({
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32),
    APP_URL: z.string().url(),
    NEXTAUTH_URL: optionalUrl,
    RESEND_API_KEY: optionalString,
    EMAIL_FROM: optionalString,
    UPSTASH_REDIS_REST_URL: optionalUrl,
    UPSTASH_REDIS_REST_TOKEN: optionalString
  })
  .superRefine((env, context) => {
    const pairedVariables = [
      ["RESEND_API_KEY", env.RESEND_API_KEY, "EMAIL_FROM", env.EMAIL_FROM],
      [
        "UPSTASH_REDIS_REST_URL",
        env.UPSTASH_REDIS_REST_URL,
        "UPSTASH_REDIS_REST_TOKEN",
        env.UPSTASH_REDIS_REST_TOKEN
      ]
    ] as const;

    for (const [firstName, firstValue, secondName, secondValue] of pairedVariables) {
      if (Boolean(firstValue) === Boolean(secondValue)) continue;

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [firstValue ? secondName : firstName],
        message: `${firstName} and ${secondName} must be configured together`
      });
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

type ServerEnvOptions = {
  requireExternalServices?: boolean;
};

export function parseServerEnv(
  environment: Record<string, string | undefined>,
  options: ServerEnvOptions = {}
): ServerEnv {
  const parsed = serverEnvSchema.safeParse(environment);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }

  if (options.requireExternalServices) {
    const requiredVariables = [
      "NEXTAUTH_URL",
      "RESEND_API_KEY",
      "EMAIL_FROM",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN"
    ] as const;
    const missingVariables = requiredVariables.filter(
      (name) => !parsed.data[name]?.trim()
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `Invalid server environment: production requires ${missingVariables.join(", ")}`
      );
    }
  }

  return parsed.data;
}

export function getServerEnv(options?: ServerEnvOptions): ServerEnv {
  return parseServerEnv(process.env, options);
}
