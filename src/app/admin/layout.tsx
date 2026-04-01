"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import {
    LayoutDashboard,
    Package,
    Users,
    MessageSquare,
    BarChart3,
    ChevronLeft,
    LogOut,
    ShieldPlus,
    Database,
    Sun,
    Moon,
    ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/software", label: "Software", icon: Package },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/requests", label: "Requests", icon: MessageSquare },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/logs", label: "Logs", icon: ScrollText },
    { href: "/admin/bucket", label: "Bucket", icon: Database },
    { href: "/admin/management", label: "Management", icon: ShieldPlus },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const { theme, setTheme } = useTheme();

    // Don't show sidebar/header on admin login page
    if (pathname === "/admin/login") {
        return <>{children}</>;
    }

    // Derive current page title from pathname
    const currentPage = adminLinks.find((link) =>
        link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href)
    );

    return (
        <div className="flex flex-col min-h-screen">
            {/* Admin Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
                <div className="flex h-14 items-center justify-between px-4 lg:px-6">
                    <div className="flex items-center gap-3">
                        <Link href="/admin" className="flex items-center gap-2.5">
                            <Image
                                src="/foss.png"
                                alt="FOSS Hub Admin"
                                width={32}
                                height={32}
                                className="h-8 w-8"
                            />
                            <span className="text-sm font-semibold tracking-tight hidden sm:inline">
                                FOSS Hub Admin
                            </span>
                        </Link>
                        {currentPage && (
                            <>
                                <span className="text-muted-foreground/40 hidden sm:inline">/</span>
                                <span className="text-sm text-muted-foreground hidden sm:inline">
                                    {currentPage.label}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" asChild className="h-8 text-muted-foreground">
                            <Link href="/">
                                <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                                Site
                            </Link>
                        </Button>
                        {session?.user && (
                            <div className="flex items-center gap-2 ml-1">
                                <div className="h-6 w-6 rounded-full bg-muted border border-border/50 flex items-center justify-center text-[10px] font-semibold">
                                    {session.user.name?.[0]?.toUpperCase() || "A"}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                >
                                    <LogOut className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="hidden lg:flex w-60 flex-col border-r border-border/50 bg-muted/30 p-4 fixed top-14 left-0 bottom-0 z-40">
                    <nav className="space-y-1 flex-1 overflow-y-auto">
                        {adminLinks.map((link) => {
                            const isActive =
                                link.href === "/admin"
                                    ? pathname === "/admin"
                                    : pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                                        ? "bg-foreground/[0.08] text-foreground font-medium"
                                        : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04]"
                                        }`}
                                >
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <button
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] transition-colors"
                    >
                        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </button>
                </aside>

                {/* Mobile nav */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur">
                    <nav className="flex items-center justify-around py-2">
                        {adminLinks.map((link) => {
                            const isActive =
                                link.href === "/admin"
                                    ? pathname === "/admin"
                                    : pathname.startsWith(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] transition-colors ${isActive ? "text-foreground" : "text-muted-foreground"
                                        }`}
                                >
                                    <link.icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto pb-20 lg:pb-0 lg:ml-60">{children}</div>
            </div>
        </div>
    );
}
