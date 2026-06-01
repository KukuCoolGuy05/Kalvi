import { withAuth } from "next-auth/middleware";

/**
 * Route protection. The (app) screens require a session; unauthenticated users
 * are bounced to /login by NextAuth. Public routes (landing, auth, api/auth)
 * are excluded via the matcher below.
 */
export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: ["/dashboard/:path*", "/learn/:path*", "/onboarding/:path*", "/settings/:path*"],
};
