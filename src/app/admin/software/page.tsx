"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Package, LayoutGrid, List, Search, FileText } from "lucide-react";
import { toast } from "sonner";
import type { SoftwareItem } from "@/types";

const categories = [
    { value: "all", label: "All Categories" },
    { value: "operating-system", label: "Operating System" },
    { value: "development", label: "Development" },
    { value: "productivity", label: "Productivity" },
    { value: "utility", label: "Utility" },
    { value: "multimedia", label: "Multimedia" },
    { value: "other", label: "Other" },
];

function SoftwareIcon({ sw }: { sw: SoftwareItem }) {
    if (sw.iconKey) {
        const iconUrl = `/api/assets/${sw.iconKey}`;
        return (
            <Image
                src={iconUrl}
                alt={sw.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover"
                unoptimized
            />
        );
    }
    return (
        <div className="h-10 w-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-muted-foreground" />
        </div>
    );
}

export default function AdminSoftwarePage() {
    const router = useRouter();
    const [software, setSoftware] = useState<SoftwareItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<"table" | "grid">("grid");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [draftCount, setDraftCount] = useState(0);

    useEffect(() => {
        fetch("/api/software?limit=100&status=published")
            .then((r) => r.json())
            .then((data) => setSoftware(data.software || []))
            .finally(() => setLoading(false));

        fetch("/api/software?status=draft&limit=1")
            .then((r) => r.json())
            .then((data) => setDraftCount(data.pagination?.total ?? 0));
    }, []);

    async function handleDelete(e: React.MouseEvent, id: string, name: string) {
        e.stopPropagation();
        if (!confirm(`Delete "${name}" and all its versions? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/software/${id}`, { method: "DELETE" });
            if (res.ok) {
                setSoftware(software.filter((s) => s._id !== id));
                toast.success("Software deleted");
            } else {
                toast.error("Delete failed");
            }
        } catch {
            toast.error("Delete failed");
        }
    }

    const filtered = software.filter((sw) => {
        const matchesCategory = categoryFilter === "all" || sw.category === categoryFilter;
        const matchesSearch = !search || sw.name.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Software Management</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/software/drafts">
                            <FileText className="mr-2 h-4 w-4" />
                            View Drafts ({draftCount})
                        </Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href="/admin/software/new">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Software
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search software..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px] bg-muted/50 border-border/50 h-9 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setView("table")}
                        className={`p-2 transition-colors ${view === "table" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setView("grid")}
                        className={`p-2 transition-colors ${view === "grid" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {software.length === 0 ? "No software added yet" : "No results match your filters"}
                        </p>
                    </CardContent>
                </Card>
            ) : view === "table" ? (
                /* Table View */
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Software</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Versions</TableHead>
                                    <TableHead>Downloads</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((sw) => (
                                    <TableRow
                                        key={sw._id}
                                        className="cursor-pointer"
                                        onClick={() => router.push(`/admin/software/${sw._id}`)}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <SoftwareIcon sw={sw} />
                                                <div>
                                                    <span className="font-medium text-sm">{sw.name}</span>
                                                    {sw.isFeatured && (
                                                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
                                                            Featured
                                                        </Badge>
                                                    )}
                                                    {sw.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-md">
                                                            {sw.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="text-xs capitalize">
                                                {sw.category.replace("-", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="tabular-nums text-sm">{sw.versions.length}</TableCell>
                                        <TableCell className="tabular-nums text-sm">{sw.totalDownloads.toLocaleString()}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => handleDelete(e, sw._id, sw.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                /* Grid View */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filtered.map((sw) => (
                        <Card
                            key={sw._id}
                            className="border-border/50 hover:bg-muted/50 transition cursor-pointer group relative"
                            onClick={() => router.push(`/admin/software/${sw._id}`)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3 mb-3">
                                    <SoftwareIcon sw={sw} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-sm truncate">{sw.name}</h3>
                                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                            {sw.category.replace("-", " ")}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                                        onClick={(e) => handleDelete(e, sw._id, sw.name)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{sw.versions.length} version{sw.versions.length !== 1 ? "s" : ""}</span>
                                    <span>{sw.totalDownloads.toLocaleString()} dl</span>
                                </div>
                                {sw.isFeatured && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-2">
                                        Featured
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                {filtered.length} of {software.length} software{software.length !== 1 ? "s" : ""}
            </p>
        </div>
    );
}
