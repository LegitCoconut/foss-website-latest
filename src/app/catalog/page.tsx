"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Search,
    Package,
    Download,
    Monitor,
    Code,
    Zap,
    Wrench,
    Film,
    Grid3X3,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import type { SoftwareItem } from "@/types";

const categoryIcons: Record<string, React.ElementType> = {
    "operating-system": Monitor,
    development: Code,
    productivity: Zap,
    utility: Wrench,
    multimedia: Film,
    other: Package,
};

const categoryColors: Record<string, string> = {
    "operating-system": "from-blue-500 to-cyan-500",
    development: "from-green-500 to-emerald-500",
    productivity: "from-yellow-500 to-orange-500",
    utility: "from-purple-500 to-pink-500",
    multimedia: "from-red-500 to-rose-500",
    other: "from-gray-500 to-slate-500",
};

function CatalogContent() {
    const searchParams = useSearchParams();
    const [software, setSoftware] = useState<SoftwareItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [category, setCategory] = useState(searchParams.get("category") || "all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category && category !== "all") params.set("category", category);
        params.set("page", page.toString());
        params.set("limit", "12");

        setLoading(true);
        fetch(`/api/software?${params}`)
            .then((r) => r.json())
            .then((data) => {
                setSoftware(data.software || []);
                setTotalPages(data.pagination?.pages || 1);
            })
            .finally(() => setLoading(false));
    }, [search, category, page]);

    function formatBytes(bytes: number) {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Software Catalog</h1>
                <p className="text-muted-foreground">
                    Browse and download free and open source software
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search software..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="pl-10 bg-white/5 border-white/10"
                    />
                </div>
                <Select
                    value={category}
                    onValueChange={(v) => {
                        setCategory(v);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10">
                        <Grid3X3 className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="operating-system">Operating Systems</SelectItem>
                        <SelectItem value="development">Development</SelectItem>
                        <SelectItem value="productivity">Productivity</SelectItem>
                        <SelectItem value="utility">Utilities</SelectItem>
                        <SelectItem value="multimedia">Multimedia</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="border-white/10 bg-white/[0.03]">
                            <CardContent className="p-5">
                                <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full mb-1" />
                                <Skeleton className="h-4 w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : software.length === 0 ? (
                <div className="text-center py-20">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No software found</h3>
                    <p className="text-muted-foreground text-sm">
                        Try adjusting your search or filters
                    </p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {software.map((sw) => {
                            const Icon = categoryIcons[sw.category] || Package;
                            const color = categoryColors[sw.category] || "from-gray-500 to-slate-500";
                            const latestVersion = sw.versions[sw.versions.length - 1];

                            return (
                                <Link key={sw._id} href={`/catalog/${sw.slug}`}>
                                    <Card className="group border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5 cursor-pointer h-full">
                                        <CardContent className="p-5">
                                            <div className="flex items-start justify-between mb-3">
                                                {sw.iconKey ? (
                                                    <div className="h-11 w-11 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                                                        <Image
                                                            src={`/api/assets/${sw.iconKey}`}
                                                            alt={sw.name}
                                                            width={44}
                                                            height={44}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`h-11 w-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}
                                                    >
                                                        <Icon className="h-5 w-5 text-white" />
                                                    </div>
                                                )}
                                                {sw.isFeatured && (
                                                    <Badge variant="secondary" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                                        Featured
                                                    </Badge>
                                                )}
                                            </div>

                                            <h3 className="font-semibold mb-1 group-hover:text-blue-400 transition-colors">
                                                {sw.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                                {sw.description || "No description available"}
                                            </p>

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Download className="h-3 w-3" />
                                                    {sw.totalDownloads.toLocaleString()}
                                                </div>
                                                {latestVersion && (
                                                    <span className="font-mono">
                                                        v{latestVersion.versionNumber}
                                                        {latestVersion.fileSize > 0 &&
                                                            ` · ${formatBytes(latestVersion.fileSize)}`}
                                                    </span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(page - 1)}
                                className="border-white/10"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground px-4">
                                Page {page} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(page + 1)}
                                className="border-white/10"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function CatalogPage() {
    return (
        <Suspense fallback={
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="border-white/10 bg-white/[0.03]">
                            <CardContent className="p-5">
                                <Skeleton className="h-12 w-12 rounded-xl mb-3" />
                                <Skeleton className="h-5 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        }>
            <CatalogContent />
        </Suspense>
    );
}
