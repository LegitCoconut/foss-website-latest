import Link from "next/link";
import { Package } from "lucide-react";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-background/50">
            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                            <Package className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            FOSS Hub
                        </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <Link href="/catalog" className="hover:text-white transition-colors">
                            Catalog
                        </Link>
                        <Link href="/dashboard/requests" className="hover:text-white transition-colors">
                            Request Software
                        </Link>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} FOSS Hub. Built for campus use.
                    </p>
                </div>
            </div>
        </footer>
    );
}
