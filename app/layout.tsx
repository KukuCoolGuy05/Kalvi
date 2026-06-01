import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityProvider } from "@/components/providers/AccessibilityProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Kalvi — learning that adapts to you",
  description:
    "An adaptive AI tutor that personalizes how it teaches — with first-class support for dyslexia, ADHD, ESL, and other learning differences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        {/* Skip link for keyboard / screen-reader users (WCAG 2.4.1). */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
        >
          Skip to content
        </a>
        <SessionProvider>
          <AccessibilityProvider>{children}</AccessibilityProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
