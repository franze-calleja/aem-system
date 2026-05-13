import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {
    role: Role;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    userId: string;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) {
          await logAudit({
            action: "LOGIN_FAILED",
            metadata: { reason: "invalid_input" },
          });
          return null;
        }

        const { email, password } = parsed.data;
        const normalized = email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email: normalized },
        });

        if (!user || user.status !== "ACTIVE") {
          await logAudit({
            action: "LOGIN_FAILED",
            userId: user?.id,
            metadata: { email: normalized, reason: user ? "suspended" : "unknown_user" },
          });
          return null;
        }

        const ok = await bcrypt.compare(password, user.hashedPassword);
        if (!ok) {
          await logAudit({
            action: "LOGIN_FAILED",
            userId: user.id,
            metadata: { email: normalized, reason: "bad_password" },
          });
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;
      await logAudit({
        action: "LOGIN",
        userId: user.id,
        resourceType: "User",
        resourceId: user.id,
      });
    },
    async signOut(message) {
      const userId =
        "token" in message && message.token && typeof message.token === "object" && "userId" in message.token
          ? (message.token as { userId?: string }).userId
          : undefined;
      await logAudit({
        action: "LOGOUT",
        userId,
      });
    },
  },
});
