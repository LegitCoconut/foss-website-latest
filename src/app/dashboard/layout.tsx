"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    LayoutDashboard,
    MessageSquare,
    Download,
    ChevronLeft,
    FolderArchive,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const dashboardLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/downloads", label: "My Downloads", icon: Download },
    { href: "/dashboard/requests", label: "My Requests", icon: MessageSquare },
    { href: "/dashboard/team-storage", label: "Team Storage", icon: FolderArchive },
    { href: "/dashboard/profile", label: "Profile", icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-60 flex-col border-r border-border/50 bg-muted/30 p-4">
                <div className="flex items-center gap-2.5 mb-6 px-2">
                    <Image
                        src="/foss.png"
                        alt="FOSS Hub"
                        width={32}
                        height={32}
                        className="h-8 w-8"
                    />
                    <span className="font-semibold text-sm tracking-tight">Dashboard</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {dashboardLinks.map((link) => {
                        const isActive =
                            link.href === "/dashboard"
                                ? pathname === "/dashboard"
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

                {/* User section */}
                {session?.user && (
                    <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 border-t border-border/50 pt-3 mt-3 px-3 py-2 rounded-lg hover:bg-foreground/[0.04] transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-muted border border-border/50 flex items-center justify-center flex-shrink-0 relative">
                            <span className="text-xs font-bold">{session.user.name?.charAt(0).toUpperCase()}</span>
                            {(session.user as any).totpEnabled && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.user.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{session.user.email}</p>
                        </div>
                    </Link>
                )}

                <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground">
                    <Link href="/">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Site
                    </Link>
                </Button>
            </aside>

            {/* Mobile nav */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur">
                <nav className="flex items-center justify-around py-2">
                    {dashboardLinks.map((link) => {
                        const isActive =
                            link.href === "/dashboard"
                                ? pathname === "/dashboard"
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
            <div className="flex-1 overflow-auto pb-20 lg:pb-0">{children}</div>
        </div>
    );
}
