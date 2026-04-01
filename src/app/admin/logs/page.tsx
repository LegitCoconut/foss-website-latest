"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Search,
    Download,
    User,
    Globe,
    Calendar,
    Package,
    FileArchive,
    ChevronLeft,
    ChevronRight,
    FolderArchive,
    Upload,
    ArrowDown,
} from "lucide-react";

interface LogEntry {
    _id: string;
    type: "software" | "team-upload" | "team-download";
    userName: string;
    userEmail: string;
    ipAddress: string;
    softwareName: string;
    versionNumber: string;
    fileName: string;
    teamName: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetchLogs();
    }, [page, search]);

    async function fetchLogs() {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "50" });
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/logs?${params}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setPagination(data.pagination || null);
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Activity Logs</h1>
                {pagination && (
                    <Badge variant="secondary" className="text-sm">{pagination.total} total</Badge>
                )}
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search user, software, IP, file..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                    />
                </div>
                <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : logs.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <Download className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No download logs found</p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Details</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.map((log) => (
                                    <TableRow key={log._id}>
                                        <TableCell>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{log.userName || "Unknown"}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-0.5">{log.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm font-mono">
                                                <Globe className="h-3 w-3 text-muted-foreground" />
                                                {(log.ipAddress?.startsWith("::ffff:") ? log.ipAddress.slice(7) : log.ipAddress) || "—"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {log.type === "team-upload" ? (
                                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                    <Upload className="h-2.5 w-2.5 mr-1" />
                                                    Team Upload
                                                </Badge>
                                            ) : log.type === "team-download" ? (
                                                <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/20">
                                                    <ArrowDown className="h-2.5 w-2.5 mr-1" />
                                                    Team Download
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Download className="h-2.5 w-2.5 mr-1" />
                                                    Software
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {log.type === "team-upload" || log.type === "team-download" ? (
                                                <div className="flex items-center gap-1.5">
                                                    <FolderArchive className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{log.teamName}</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{log.softwareName}</span>
                                                        {log.versionNumber && (
                                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">v{log.versionNumber}</Badge>
                                                        )}
                                                    </div>
                                                    {log.fileName && (
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                                            <FileArchive className="h-2.5 w-2.5" />
                                                            <span className="truncate max-w-[180px]">{log.fileName}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        Page {pagination.page} of {pagination.pages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= pagination.pages}
                            onClick={() => setPage(page + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
