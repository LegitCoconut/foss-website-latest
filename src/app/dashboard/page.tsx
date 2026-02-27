"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Package, MessageSquarePlus, Calendar } from "lucide-react";

interface DownloadEntry {
    softwareName: string;
    versionNumber: string;
    createdAt: string;
}

interface RequestEntry {
    _id: string;
    title: string;
    status: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function DashboardPage() {
    const { data: session } = useSession();
    const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/requests").then((r) => r.json()),
        ])
            .then(([reqData]) => {
                setRequests(reqData.requests || []);
            })
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">
                    Welcome, {session?.user?.name || "User"}
                </h1>
                <p className="text-muted-foreground">
                    Manage your downloads and software requests
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
                <Link href="/catalog">
                    <Card className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition cursor-pointer h-full">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Browse Catalog</h3>
                                <p className="text-sm text-muted-foreground">Find software to download</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/requests">
                    <Card className="border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition cursor-pointer h-full">
                        <CardContent className="p-6 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                <MessageSquarePlus className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Request Software</h3>
                                <p className="text-sm text-muted-foreground">Ask for new software</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Recent Requests */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">My Software Requests</CardTitle>
                    <Button asChild variant="outline" size="sm" className="border-white/10">
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
                        <div className="text-center py-8">
                            <MessageSquarePlus className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No requests yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-white/10">
                                    <TableHead>Title</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.slice(0, 5).map((req) => (
                                    <TableRow key={req._id} className="border-white/10">
                                        <TableCell className="font-medium">{req.title}</TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[req.status] || ""}>
                                                {req.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1">
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
        </div>
    );
}
