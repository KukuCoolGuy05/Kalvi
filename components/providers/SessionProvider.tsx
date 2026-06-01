"use client";

// Thin client wrapper so the root layout (a server component) can mount
// NextAuth's SessionProvider without itself becoming a client component.
import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function SessionProvider({ children }: { children: ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
