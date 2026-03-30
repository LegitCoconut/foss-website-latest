"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import type { SoftwareItem } from "@/types";

function DraftIcon({ sw }: { sw: SoftwareItem }) {
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

export default function AdminSoftwareDraftsPage() {
    const [drafts, setDrafts] = useState<SoftwareItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/software?status=draft&limit=100")
            .then((r) => r.json())
            .then((data) => setDrafts(data.software || []))
            .finally(() => setLoading(false));
    }, []);

    async function handleDelete(e: React.MouseEvent, id: string, name: string) {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Delete draft "${name}"? This cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/software/${id}`, { method: "DELETE" });
            if (res.ok) {
                setDrafts(drafts.filter((d) => d._id !== id));
                toast.success("Draft deleted");
            } else {
                toast.error("Delete failed");
            }
        } catch {
            toast.error("Delete failed");
        }
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                        <Link href="/admin/software">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Software Drafts</h1>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : drafts.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No drafts yet</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {drafts.map((sw) => (
                        <Link
                            key={sw._id}
                            href={`/admin/software/new?draft=${sw._id}`}
                        >
                            <Card className="border-border/50 hover:bg-muted/50 transition cursor-pointer group relative h-full">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <DraftIcon sw={sw} />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-sm truncate">{sw.name}</h3>
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1 capitalize">
                                                {sw.category.replace("-", " ")}
                                            </Badge>
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
                                        <span>Step {sw.completedSteps} of 4</span>
                                        <span>{new Date(sw.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${(sw.completedSteps / 4) * 100}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                {drafts.length} draft{drafts.length !== 1 ? "s" : ""}
            </p>
        </div>
    );
}
