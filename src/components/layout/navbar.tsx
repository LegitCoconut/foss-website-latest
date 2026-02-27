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
    User,
    LogOut,
    LayoutDashboard,
    Shield,
    Download,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
    { href: "/catalog", label: "Catalog" },
];

export function Navbar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const isAdmin = (session?.user as { role?: string })?.role === "admin";

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 transition-transform group-hover:scale-105">
                        <Package className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        FOSS Hub
                    </span>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === link.href
                                    ? "bg-white/10 text-white"
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                {/* Desktop actions */}
                <div className="hidden md:flex items-center gap-3">
                    {session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
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
                                        <Download className="h-4 w-4" />
                                        My Requests
                                    </Link>
                                </DropdownMenuItem>
                                {isAdmin && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem asChild>
                                            <Link href="/admin" className="gap-2">
                                                <Shield className="h-4 w-4" />
                                                Admin Panel
                                            </Link>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-red-400">
                                    <LogOut className="h-4 w-4" />
                                    Sign Out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                                <Link href="/login">Sign In</Link>
                            </Button>
                            <Button
                                size="sm"
                                asChild
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            >
                                <Link href="/register">Get Started</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Mobile menu */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild className="md:hidden">
                        <Button variant="ghost" size="icon">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-72">
                        <nav className="flex flex-col gap-2 mt-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${pathname === link.href
                                            ? "bg-white/10 text-white"
                                            : "text-muted-foreground hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            {session?.user ? (
                                <>
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5"
                                    >
                                        Dashboard
                                    </Link>
                                    {isAdmin && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setOpen(false)}
                                            className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5"
                                        >
                                            Admin Panel
                                        </Link>
                                    )}
                                    <button
                                        onClick={() => {
                                            signOut();
                                            setOpen(false);
                                        }}
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-white/5 text-left"
                                    >
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-3 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600"
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
