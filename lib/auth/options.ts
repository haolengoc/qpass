import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { isStaff } from "./access";
import { enforceRegistrationRateLimit } from "@/lib/rate-limit/registration";

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128),
  audience: z.enum(["staff", "participant"]).default("staff")
});

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt"
  },
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        audience: { label: "Audience", type: "text" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.trim().toLowerCase();
        try {
          await enforceRegistrationRateLimit(`login:${email}`);
        } catch {
          return null;
        }
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        if (parsed.data.audience === "staff" ? !isStaff(user.role) : user.role !== "PARTICIPANT") return null;

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );
        if (!validPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
      }
      return session;
    }
  }
};
