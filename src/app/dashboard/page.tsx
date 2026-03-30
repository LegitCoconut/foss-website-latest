"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, MessageSquarePlus, Calendar, Download } from "lucide-react";

interface RequestEntry {
    _id: string;
    title: string;
    status: string;
    createdAt: string;
}

interface DownloadEntry {
    _id: string;
    softwareName: string;
    versionNumber: string;
    createdAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    approved: "secondary",
    rejected: "destructive",
    completed: "default",
};

export default function DashboardPage() {
    const { data: session } = useSession();
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/requests").then((r) => r.json()),
            fetch("/api/downloads").then((r) => r.json()),
        ])
            .then(([reqData, dlData]) => {
                setRequests(reqData.requests || []);
                setDownloads(dlData.downloads || []);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Welcome, {session?.user?.name || "User"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Manage your downloads and software requests
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <Link href="/catalog">
                    <Card className="border-border/50 bg-card hover:bg-muted/50 transition cursor-pointer h-full">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                <Package className="h-5 w-5 text-foreground/70" />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">Browse Catalog</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Find software to download</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/requests">
                    <Card className="border-border/50 bg-card hover:bg-muted/50 transition cursor-pointer h-full">
                        <CardContent className="p-5 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                <MessageSquarePlus className="h-5 w-5 text-foreground/70" />
                            </div>
                            <div>
                                <h3 className="font-medium text-sm">Request Software</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Ask for new software</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Requests */}
            <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-base font-semibold">My Software Requests</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard/requests">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-10">
                            <MessageSquarePlus className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No requests yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.slice(0, 5).map((req) => (
                                    <TableRow key={req._id}>
                                        <TableCell className="font-medium">{req.title}</TableCell>
                                        <TableCell>
                                            <Badge variant={statusVariant[req.status] || "outline"}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Recent Downloads */}
            <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-4">
                    <CardTitle className="text-base font-semibold">My Downloads</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/dashboard/downloads">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : downloads.length === 0 ? (
                        <div className="text-center py-10">
                            <Download className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No downloads yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Software</TableHead>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {downloads.slice(0, 5).map((dl) => (
                                    <TableRow key={dl._id}>
                                        <TableCell className="font-medium">{dl.softwareName}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="font-mono text-xs">
                                                v{dl.versionNumber}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(dl.createdAt).toLocaleDateString()}
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
