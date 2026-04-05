import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export default {
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // authorize is handled in the full auth.ts (Node runtime)
            async authorize() {
                return null;
            },
        }),
    ],
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnAdminLogin = nextUrl.pathname === "/admin/login";

            // MFA enforcement
            if (isLoggedIn) {
                const mfaPending = (auth?.user as any)?.mfaPending;
                const totpEnabled = (auth?.user as any)?.totpEnabled;
                const role = (auth?.user as any)?.role;

                // If MFA verification pending, only allow mfa-verify page and auth APIs
                if (mfaPending) {
                    const mfaAllowedPaths = ["/mfa-verify", "/api/auth"];
                    const isAllowed = mfaAllowedPaths.some(p => nextUrl.pathname.startsWith(p));
                    if (!isAllowed) {
                        return Response.redirect(new URL("/mfa-verify", nextUrl));
                    }
                    return true;
                }

                // Force admin MFA setup if not enabled
                if (role === "admin" && !totpEnabled) {
                    const isOnMfaSetup = nextUrl.pathname === "/admin/mfa-setup";
                    const isOnAuth = nextUrl.pathname.startsWith("/api/auth");
                    if (nextUrl.pathname.startsWith("/admin") && !isOnMfaSetup && !isOnAdminLogin) {
                        return Response.redirect(new URL("/admin/mfa-setup", nextUrl));
                    }
                }
            }

            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isOnAdmin = nextUrl.pathname.startsWith("/admin");
            const isOnApiDownload = nextUrl.pathname.startsWith("/api/download");
            const isOnApiUpload = nextUrl.pathname.startsWith("/api/upload");

            // Allow access to admin login page without auth
            if (isOnAdminLogin) {
                if (isLoggedIn) {
                    const role = (auth?.user as { role?: string })?.role;
                    if (role === "admin") {
                        return Response.redirect(new URL("/admin", nextUrl));
                    }
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true;
            }

            if (isOnAdmin) {
                if (!isLoggedIn) return Response.redirect(new URL("/admin/login", nextUrl));
                const role = (auth?.user as { role?: string })?.role;
                if (role !== "admin") {
                    return Response.redirect(new URL("/", nextUrl));
                }
                return true;
            }

            if (isOnDashboard) {
                if (!isLoggedIn) return false;
                const role = (auth?.user as { role?: string })?.role;
                if (role === "admin") {
                    return Response.redirect(new URL("/admin", nextUrl));
                }
                return true;
            }

            if (isOnApiDownload) {
                return isLoggedIn;
            }

            if (isOnApiUpload) {
                if (!isLoggedIn) return false;
                const role = (auth?.user as { role?: string })?.role;
                return role === "admin";
            }

            const isOnApiTeamStorage = nextUrl.pathname.startsWith("/api/team-storage");
            if (isOnApiTeamStorage) {
                return isLoggedIn;
            }

            return true;
        },
        jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role;
                token.mfaPending = (user as any).mfaPending || false;
                token.totpEnabled = (user as any).totpEnabled || false;
            }
            if (trigger === "update" && (session as any)?.mfaVerified === true) {
                token.mfaPending = false;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as any).role = token.role as string;
                (session.user as any).mfaPending = token.mfaPending as boolean;
                (session.user as any).totpEnabled = token.totpEnabled as boolean;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
} satisfies NextAuthConfig;
