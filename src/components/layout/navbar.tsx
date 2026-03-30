"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
    Package,
    Menu,
    LogOut,
    LayoutDashboard,
    Shield,
    MessageSquare,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
    { href: "/catalog", label: "Catalog" },
];

const authNavLinks = [
    { href: "/catalog", label: "Catalog" },
    { href: "/dashboard", label: "My Dashboard" },
];

export function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const isAdmin = (session?.user as { role?: string })?.role === "admin";

    // Hide the main navbar on admin pages (they have their own header)
    if (pathname.startsWith("/admin")) return null;

    return (
        <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-14 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:scale-105">
                        <Package className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold tracking-tight">
                        FOSS Hub
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {(session?.user && !isAdmin ? authNavLinks : navLinks).map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pathname === link.href
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop actions */}
                <div className="hidden md:flex items-center gap-2">
                    {session?.user ? (
                        isAdmin ? (
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" asChild className="h-8 gap-2">
                                    <Link href="/admin">
                                        <Shield className="h-4 w-4" />
                                        Admin Panel
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => signOut()} className="h-8 gap-2 text-destructive hover:text-destructive">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </Button>
                            </div>
                        ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2 h-8">
                                    <div className="h-6 w-6 rounded-full bg-muted border border-border/50 flex items-center justify-center text-[10px] font-semibold text-foreground">
                                        {session.user.name?.[0]?.toUpperCase() || "U"}
                                    </div>
                                    <span className="text-sm">{session.user.name}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard" className="gap-2">
                                        <LayoutDashboard className="h-4 w-4" />
                                        Dashboard
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href="/dashboard/requests" className="gap-2">
                                        <MessageSquare className="h-4 w-4" />
                                        My Requests
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-destructive focus:text-destructive">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        )
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild className="h-8">
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button size="sm" asChild className="h-8">
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Mobile menu */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild className="md:hidden">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Menu className="h-4 w-4" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-72">
                        <nav className="flex flex-col gap-1 mt-6">
                            {(session?.user && !isAdmin ? authNavLinks : navLinks).map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${pathname === link.href
                                        ? "bg-muted text-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {session?.user ? (
                                isAdmin ? (
                                    <>
                                        <Link
                                            href="/admin"
                                            onClick={() => setOpen(false)}
                                            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        >
                                            Admin Panel
                                        </Link>
                                        <button
                                            onClick={() => {
                                                signOut();
                                                setOpen(false);
                                            }}
                                            className="px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-muted/50 text-left"
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <Link
                                            href="/dashboard"
                                            onClick={() => setOpen(false)}
                                            className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        >
                                            Dashboard
                                        </Link>
                                        <button
                                            onClick={() => {
                                                signOut();
                                                setOpen(false);
                                            }}
                                            className="px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-muted/50 text-left"
                                        >
                                            Sign Out
                                        </button>
                                    </>
                                )
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setOpen(false)}
                                        className="px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setOpen(false)}
                                        className="px-3 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground text-center"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </nav>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
