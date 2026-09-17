import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { Redis } from "@upstash/redis";
import { getServerEnv } from "../lib/env/server";

function isPrivateHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.endsWith(".local") ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.")
  ) {
    return true;
  }

  const match = /^172\.(\d{1,3})\./.exec(normalized);
  return match ? Number(match[1]) >= 16 && Number(match[1]) <= 31 : false;
}

function requirePublicUrl(name: string, value: string, protocols: string[]) {
  const url = new URL(value);
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use ${protocols.join(" or ")}.`);
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error(`${name} must not point to localhost or a private network address.`);
  }
  return url;
}

async function main() {
  loadEnvConfig(process.cwd(), false);
  const env = getServerEnv({ requireExternalServices: true });

  const appUrl = requirePublicUrl("APP_URL", env.APP_URL, ["https:"]);
  const authUrl = requirePublicUrl("NEXTAUTH_URL", env.NEXTAUTH_URL!, ["https:"]);
  if (appUrl.origin !== authUrl.origin) {
    throw new Error("APP_URL and NEXTAUTH_URL must have the same origin.");
  }

  requirePublicUrl("DATABASE_URL", env.DATABASE_URL, ["postgres:", "postgresql:"]);
  requirePublicUrl("DIRECT_URL", env.DIRECT_URL, ["postgres:", "postgresql:"]);

  const prisma = new PrismaClient({
    datasources: { db: { url: env.DIRECT_URL } }
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
  } finally {
    await prisma.$disconnect();
  }

  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!
  });
  const pong = await redis.ping();
  if (pong !== "PONG") throw new Error("Upstash Redis did not return PONG.");

  console.log("Production readiness check passed:");
  console.log(`- App URL: ${appUrl.origin}`);
  console.log("- PostgreSQL connection: OK");
  console.log("- Upstash Redis connection: OK");
  console.log("- Resend configuration: present (delivery is checked separately)");
}

main().catch((error) => {
  console.error(
    `Production readiness check failed: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
});
