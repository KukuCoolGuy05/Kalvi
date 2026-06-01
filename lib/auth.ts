import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUserByEmail } from "@/lib/db/queries";

/**
 * Auth configuration.
 *
 * Per the build order we start with EMAIL sign-in. NextAuth's canonical email
 * flow is a magic link, which needs an SMTP server — overkill for local dev
 * and the MVP. So email sign-in here is a passwordless "enter your email"
 * Credentials provider that upserts the user. It is clearly dev-grade; swap in
 * the EmailProvider (magic links) before production.
 *
 * Google is wired up but only registered if its env vars are present, so the
 * app runs without Google credentials.
 *
 * Because Credentials requires the JWT session strategy (the database adapter
 * can't persist Credentials sessions), we use JWT and still attach the Prisma
 * adapter for the OAuth account linking that Google needs.
 */

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "email",
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email", placeholder: "you@example.com" },
      name: { label: "Name", type: "text" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      if (!email || !email.includes("@")) return null;
      const user = await getOrCreateUserByEmail(email, credentials?.name || null);
      return { id: user.id, email: user.email, name: user.name };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Persist the DB user id on the token so route handlers can read it.
    async jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id;
      } else if (token.email && !token.uid) {
        const dbUser = await prisma.user.findUnique({ where: { email: token.email } });
        if (dbUser) token.uid = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) {
        (session.user as { id?: string }).id = token.uid as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

/** Server-side helper to get the current user id (or null). */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
}
