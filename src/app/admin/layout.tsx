"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Package,
    Users,
    MessageSquare,
    BarChart3,
    ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/software", label: "Software", icon: Package },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/requests", label: "Requests", icon: MessageSquare },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="flex min-h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-64 flex-col border-r border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-6 px-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <LayoutDashboard className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-semibold">Admin Panel</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {adminLinks.map((link) => {
                        const isActive =
                            link.href === "/admin"
                                ? pathname === "/admin"
                                : pathname.startsWith(link.href);
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive
                                        ? "bg-white/10 text-white font-medium"
                                        : "text-muted-foreground hover:text-white hover:bg-white/5"
                                    }`}
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground">
                    <Link href="/">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Site
                    </Link>
                </Button>
            </aside>

            {/* Mobile nav */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-background/95 backdrop-blur">
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
                                className={`flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] transition-colors ${isActive ? "text-white" : "text-muted-foreground"
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
