import { loadEnvConfig } from "@next/env";
import {
  createBootstrapAdmin,
  parseBootstrapAdminEnvironment
} from "../lib/auth/bootstrap-admin";

async function main() {
  const { combinedEnv } = loadEnvConfig(process.cwd(), false);
  const config = parseBootstrapAdminEnvironment(combinedEnv);
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({
    datasources: { db: { url: config.DIRECT_URL } }
  });

  try {
    const admin = await createBootstrapAdmin(prisma, config);
    console.log(`Created production admin ${admin.email} (${admin.id}).`);
    console.log("The password was not printed or stored in plain text.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
