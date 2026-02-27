"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import type { SoftwareItem } from "@/types";

export default function AdminSoftwarePage() {
    const [software, setSoftware] = useState<SoftwareItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/software?limit=100")
            .then((r) => r.json())
            .then((data) => setSoftware(data.software || []))
            .finally(() => setLoading(false));
    }, []);

    async function handleDelete(id: string, name: string) {
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

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Software Management</h1>
                <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
                    <Link href="/admin/software/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Software
                    </Link>
                </Button>
            </div>

            <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : software.length === 0 ? (
                        <div className="p-12 text-center">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground">No software added yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Versions</TableHead>
                                    <TableHead>Downloads</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {software.map((sw) => (
                                    <TableRow key={sw._id} className="border-white/10">
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{sw.name}</span>
                                                {sw.isFeatured && (
                                                    <Badge className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                                        Featured
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-white/5 border-white/10 text-xs">
                                                {sw.category}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{sw.versions.length}</TableCell>
                                        <TableCell>{sw.totalDownloads.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button asChild variant="ghost" size="icon">
                                                    <Link href={`/admin/software/${sw._id}`}>
                                                        <Edit className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(sw._id, sw.name)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
