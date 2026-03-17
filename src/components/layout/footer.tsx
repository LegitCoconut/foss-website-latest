"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";

export function Footer() {
    const pathname = usePathname();

    // Hide footer on admin pages
    if (pathname.startsWith("/admin")) return null;

    return (
        <footer className="border-t border-border/50">
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
                            <Package className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight">
                            FOSS Hub
                        </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <Link href="/catalog" className="hover:text-foreground transition-colors">
                            Catalog
                        </Link>
                        <Link href="/dashboard/requests" className="hover:text-foreground transition-colors">
                            Request Software
                        </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()} FOSS Hub. Built for campus use.
                    </p>
                </div>
            </div>
        </footer>
    );
}
