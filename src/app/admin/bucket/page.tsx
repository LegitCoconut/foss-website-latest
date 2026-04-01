"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Search,
    HardDrive,
    FileWarning,
    Link2,
    Database,
    Package,
    Calendar,
    Image as ImageIcon,
    Trash2,
    AlertTriangle,
    Loader2,
} from "lucide-react";

interface BucketFile {
    key: string;
    size: number;
    lastModified: string;
    bucket: "files" | "assets";
    isOrphan: boolean;
    softwareName: string | null;
    softwareId: string | null;
    detail: string | null;
}

interface BucketSummary {
    totalFiles: number;
    totalSize: number;
    orphanCount: number;
    linkedCount: number;
    filesBucketCount: number;
    filesBucketSize: number;
    assetsBucketCount: number;
    assetsBucketSize: number;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export default function BucketManagementPage() {
    const [files, setFiles] = useState<BucketFile[]>([]);
    const [summary, setSummary] = useState<BucketSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "linked" | "orphan">("all");
    const [bucketFilter, setBucketFilter] = useState<"all" | "files" | "assets">("all");

    // Delete dialog state
    const [deleteTarget, setDeleteTarget] = useState<BucketFile | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchFiles();
    }, []);

    async function fetchFiles() {
        try {
            const res = await fetch("/api/admin/bucket");
            const data = await res.json();
            setFiles(data.files || []);
            setSummary(data.summary || null);
        } finally {
            setLoading(false);
        }
    }

    function openDelete(file: BucketFile) {
        setDeleteTarget(file);
        setDeletePassword("");
        setDeleteConfirmText("");
    }

    function closeDelete() {
        setDeleteTarget(null);
        setDeletePassword("");
        setDeleteConfirmText("");
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);

        try {
            const res = await fetch("/api/admin/bucket", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: deleteTarget.key,
                    bucket: deleteTarget.bucket,
                    isOrphan: deleteTarget.isOrphan,
                    password: deleteTarget.isOrphan ? undefined : deletePassword,
                    confirmText: deleteTarget.isOrphan ? undefined : deleteConfirmText,
                    softwareName: deleteTarget.softwareName,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Delete failed");
                return;
            }

            setFiles(files.filter((f) => !(f.key === deleteTarget.key && f.bucket === deleteTarget.bucket)));
            if (summary) {
                setSummary({
                    ...summary,
                    totalFiles: summary.totalFiles - 1,
                    totalSize: summary.totalSize - deleteTarget.size,
                    orphanCount: deleteTarget.isOrphan ? summary.orphanCount - 1 : summary.orphanCount,
                    linkedCount: deleteTarget.isOrphan ? summary.linkedCount : summary.linkedCount - 1,
                    filesBucketCount: deleteTarget.bucket === "files" ? summary.filesBucketCount - 1 : summary.filesBucketCount,
                    filesBucketSize: deleteTarget.bucket === "files" ? summary.filesBucketSize - deleteTarget.size : summary.filesBucketSize,
                    assetsBucketCount: deleteTarget.bucket === "assets" ? summary.assetsBucketCount - 1 : summary.assetsBucketCount,
                    assetsBucketSize: deleteTarget.bucket === "assets" ? summary.assetsBucketSize - deleteTarget.size : summary.assetsBucketSize,
                });
            }
            toast.success("File deleted from bucket");
            closeDelete();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setDeleting(false);
        }
    }

    const expectedConfirmText = deleteTarget?.softwareName
        ? `delete ${deleteTarget.softwareName} upload`
        : "";
    const confirmTextMatch = deleteConfirmText.trim().toLowerCase() === expectedConfirmText.toLowerCase();

    const filtered = files.filter((f) => {
        const matchesSearch = !search ||
            f.key.toLowerCase().includes(search.toLowerCase()) ||
            (f.softwareName || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "orphan" && f.isOrphan) ||
            (statusFilter === "linked" && !f.isOrphan);
        const matchesBucket = bucketFilter === "all" || f.bucket === bucketFilter;
        return matchesSearch && matchesStatus && matchesBucket;
    });

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Bucket Management</h1>
                {summary && (
                    <Badge variant="secondary" className="text-sm">{summary.totalFiles} files</Badge>
                )}
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                    <Database className="h-4 w-4 text-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Total Size</p>
                                    <p className="text-lg font-bold tabular-nums">{formatBytes(summary.totalSize)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    <HardDrive className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Files Bucket</p>
                                    <p className="text-lg font-bold tabular-nums">{summary.filesBucketCount}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatBytes(summary.filesBucketSize)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                                    <ImageIcon className="h-4 w-4 text-purple-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Assets Bucket</p>
                                    <p className="text-lg font-bold tabular-nums">{summary.assetsBucketCount}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatBytes(summary.assetsBucketSize)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-border/50">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <FileWarning className="h-4 w-4 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Orphan Files</p>
                                    <p className="text-lg font-bold tabular-nums text-red-400">{summary.orphanCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search file key or software..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center border border-border/50 rounded-lg overflow-hidden text-sm">
                    {(["all", "files", "assets"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setBucketFilter(f)}
                            className={`px-3 py-1.5 transition-colors capitalize ${bucketFilter === f ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="flex items-center border border-border/50 rounded-lg overflow-hidden text-sm">
                    {(["all", "linked", "orphan"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setStatusFilter(f)}
                            className={`px-3 py-1.5 transition-colors capitalize ${statusFilter === f ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* File Table */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <Database className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {files.length === 0 ? "No files in buckets" : "No files match your filters"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Key</TableHead>
                                    <TableHead>Bucket</TableHead>
                                    <TableHead>Linked To</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Modified</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((file) => (
                                    <TableRow
                                        key={`${file.bucket}-${file.key}`}
                                        className={file.isOrphan ? "bg-red-500/[0.03]" : ""}
                                    >
                                        <TableCell>
                                            <code className="text-xs font-mono text-muted-foreground break-all">
                                                {file.key}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={`text-[10px] ${file.bucket === "files" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                                                {file.bucket}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {file.softwareName ? (
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                    <div>
                                                        <a
                                                            href={`/admin/software/${file.softwareId}`}
                                                            className="text-sm font-medium hover:underline"
                                                        >
                                                            {file.softwareName}
                                                        </a>
                                                        <p className="text-xs text-muted-foreground">{file.detail}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-red-400 italic">Not linked</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm tabular-nums">{formatBytes(file.size)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(file.lastModified).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {file.isOrphan ? (
                                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                                                    <FileWarning className="h-3 w-3 mr-1" />
                                                    Orphan
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                                                    <Link2 className="h-3 w-3 mr-1" />
                                                    Linked
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => openDelete(file)}
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
            )}

            <p className="text-xs text-muted-foreground">
                {filtered.length} of {files.length} file{files.length !== 1 ? "s" : ""}
            </p>

            {/* Delete Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) closeDelete(); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    {deleteTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete File
                                </DialogTitle>
                                <DialogDescription>
                                    {deleteTarget.isOrphan
                                        ? "This orphan file is not linked to any software and can be safely deleted."
                                        : "This file is linked to a software entry. Deleting it will break the download. This action cannot be undone."
                                    }
                                </DialogDescription>
                            </DialogHeader>

                            {/* File info */}
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-1 text-sm">
                                <p className="font-mono text-xs break-all text-muted-foreground">{deleteTarget.key}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span>{formatBytes(deleteTarget.size)}</span>
                                    <Badge variant="secondary" className={`text-[10px] ${deleteTarget.bucket === "files" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-purple-500/10 text-purple-400 border-purple-500/20"}`}>
                                        {deleteTarget.bucket}
                                    </Badge>
                                    {deleteTarget.softwareName && (
                                        <span>Linked to: <strong>{deleteTarget.softwareName}</strong></span>
                                    )}
                                </div>
                            </div>

                            {/* Non-orphan: require password + confirmation */}
                            {!deleteTarget.isOrphan && (
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="deletePassword">Admin Password</Label>
                                        <Input
                                            id="deletePassword"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="Enter your password"
                                            className="bg-muted/50 border-border/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="deleteConfirm">
                                            Type <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-destructive">{expectedConfirmText}</code> to confirm
                                        </Label>
                                        <Input
                                            id="deleteConfirm"
                                            value={deleteConfirmText}
                                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                                            placeholder={expectedConfirmText}
                                            className="bg-muted/50 border-border/50"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={closeDelete} disabled={deleting}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={confirmDelete}
                                    disabled={deleting || (!deleteTarget.isOrphan && (!deletePassword || !confirmTextMatch))}
                                >
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
