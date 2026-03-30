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
            const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
            const isOnAdmin = nextUrl.pathname.startsWith("/admin");
            const isOnAdminLogin = nextUrl.pathname === "/admin/login";
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

            return true;
        },
        jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
            }
            return token;
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                (session.user as { role?: string }).role = token.role as string;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
    },
} satisfies NextAuthConfig;
