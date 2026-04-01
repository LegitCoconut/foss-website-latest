"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    FolderArchive,
    Upload,
    Download,
    Trash2,
    Users,
    Files,
    HardDrive,
    ChevronLeft,
    Loader2,
    AlertTriangle,
    FileIcon,
    Calendar,
    Ban,
    ArrowUp,
    Clock,
    X,
    User,
} from "lucide-react";
import type { TeamItem, TeamFileItem } from "@/types";

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatSpeed(bps: number): string {
    if (bps === 0) return "0 B/s";
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bps) / Math.log(1024));
    return (bps / Math.pow(1024, i)).toFixed(i > 1 ? 2 : 1) + " " + units[i];
}

function formatTime(s: number): string {
    if (s <= 0 || !isFinite(s)) return "--";
    if (s < 60) return `${Math.ceil(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.ceil(s % 60)}s`;
}

interface UploadStats {
    percent: number;
    loaded: number;
    total: number;
    speed: number;
    elapsed: number;
    remaining: number;
    currentFileName: string;
    currentIndex: number;
    totalFiles: number;
}

export default function TeamDetailPage() {
    const { teamId } = useParams<{ teamId: string }>();
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [team, setTeam] = useState<TeamItem | null>(null);
    const [files, setFiles] = useState<TeamFileItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Multi-file upload state
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; description: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);

    // File detail dialog
    const [detailFile, setDetailFile] = useState<TeamFileItem | null>(null);

    // Delete file dialog
    const [deleteFile, setDeleteFile] = useState<TeamFileItem | null>(null);
    const [deletingFile, setDeletingFile] = useState(false);

    useEffect(() => {
        fetchTeamData();
    }, [teamId]);

    async function fetchTeamData() {
        try {
            const res = await fetch(`/api/team-storage/${teamId}`);
            if (!res.ok) {
                toast.error("Failed to load team");
                return;
            }
            const data = await res.json();
            setTeam(data.team);
            setFiles(data.files || []);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const newFiles = Array.from(e.target.files || []);
        e.target.value = "";
        if (newFiles.length === 0) return;
        setSelectedFiles((prev) => [...prev, ...newFiles.map((f) => ({ file: f, description: "" }))]);
    }

    function removeSelectedFile(index: number) {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function updateFileDescription(index: number, description: string) {
        setSelectedFiles((prev) => prev.map((item, i) => i === index ? { ...item, description } : item));
    }

    async function handleUploadAll() {
        if (!team || selectedFiles.length === 0) return;

        const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
        const remaining = team.storageLimit - team.totalStorageUsed;
        if (totalSize > remaining) {
            toast.error(`Total size (${formatBytes(totalSize)}) exceeds remaining storage (${formatBytes(remaining)})`);
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const { file, description } = selectedFiles[i];

            setUploadStats({
                percent: 0, loaded: 0, total: file.size, speed: 0,
                elapsed: 0, remaining: 0,
                currentFileName: file.name, currentIndex: i + 1, totalFiles: selectedFiles.length,
            });

            try {
                // 1. Get presigned URL
                const presignRes = await fetch(`/api/team-storage/${teamId}/files`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: file.name,
                        contentType: file.type || "application/octet-stream",
                        fileSize: file.size,
                        description: description.trim(),
                    }),
                });

                const presignData = await presignRes.json();
                if (!presignRes.ok) {
                    toast.error(`${file.name}: ${presignData.error || "Upload failed"}`);
                    continue;
                }

                // 2. Upload to S3 with progress tracking
                const ok = await new Promise<boolean>((resolve) => {
                    const startTime = Date.now();
                    let lastLoaded = 0;
                    let lastTime = startTime;
                    let smoothSpeed = 0;

                    const xhr = new XMLHttpRequest();
                    xhr.upload.addEventListener("progress", (e) => {
                        if (!e.lengthComputable) return;
                        const now = Date.now();
                        const elapsedMs = now - startTime;
                        const intervalMs = now - lastTime;
                        if (intervalMs > 100) {
                            const intervalSpeed = ((e.loaded - lastLoaded) / intervalMs) * 1000;
                            smoothSpeed = smoothSpeed === 0 ? intervalSpeed : smoothSpeed * 0.7 + intervalSpeed * 0.3;
                            lastLoaded = e.loaded;
                            lastTime = now;
                        }
                        setUploadStats({
                            percent: Math.round((e.loaded / e.total) * 100),
                            loaded: e.loaded,
                            total: e.total,
                            speed: smoothSpeed,
                            elapsed: elapsedMs / 1000,
                            remaining: smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0,
                            currentFileName: file.name,
                            currentIndex: i + 1,
                            totalFiles: selectedFiles.length,
                        });
                    });
                    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.open("PUT", presignData.uploadUrl);
                    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                    xhr.send(file);
                });

                if (ok) {
                    successCount++;
                } else {
                    toast.error(`${file.name}: Upload failed`);
                }
            } catch {
                toast.error(`${file.name}: Upload failed`);
            }
        }

        if (successCount > 0) {
            toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
        }
        setSelectedFiles([]);
        setUploading(false);
        setUploadStats(null);
        fetchTeamData();
    }

    async function handleDownload(file: TeamFileItem) {
        try {
            const res = await fetch(`/api/team-storage/${teamId}/files/${file._id}/download`);
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Download failed");
                return;
            }
            const a = document.createElement("a");
            a.href = data.url;
            a.download = data.fileName;
            a.click();
        } catch {
            toast.error("Download failed");
        }
    }

    async function handleDeleteFile() {
        if (!deleteFile) return;
        setDeletingFile(true);
        try {
            const res = await fetch(`/api/team-storage/${teamId}/files`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: deleteFile._id }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Delete failed");
                return;
            }
            toast.success("File deleted");
            setDeleteFile(null);
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setDeletingFile(false);
        }
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-28" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!team) {
        return (
            <div className="p-6">
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <FolderArchive className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Team not found or access denied</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const pct = team.storageLimit > 0 ? Math.min((team.totalStorageUsed / team.storageLimit) * 100, 100) : 0;
    const remainingStorage = Math.max(team.storageLimit - team.totalStorageUsed, 0);
    const selectedTotalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <Link href="/dashboard/team-storage">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
                        {team.status === "suspended" && (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20">
                                <Ban className="h-3 w-3 mr-1" />
                                Suspended
                            </Badge>
                        )}
                    </div>
                    {team.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">{team.description}</p>
                    )}
                </div>
            </div>

            {/* Stats — single card */}
            <Card className="border-border/50">
                <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                        <div className="flex items-center gap-6 flex-1">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold tabular-nums leading-none">{team.memberCount}</p>
                                    <p className="text-[11px] text-muted-foreground">Members</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-border/50 hidden md:block" />
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                    <Files className="h-4 w-4 text-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold tabular-nums leading-none">{team.fileCount}</p>
                                    <p className="text-[11px] text-muted-foreground">Files</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-border/50 hidden md:block" />
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                    <HardDrive className="h-4 w-4 text-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold tabular-nums leading-none">{formatBytes(team.totalStorageUsed)}</p>
                                    <p className="text-[11px] text-muted-foreground">of {formatBytes(team.storageLimit)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="md:w-48 space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{pct.toFixed(0)}% used</span>
                                <span>{formatBytes(remainingStorage)} free</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-400/60"}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Suspended banner */}
            {team.status === "suspended" && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 flex items-center gap-2 text-sm text-red-400">
                    <Ban className="h-4 w-4 flex-shrink-0" />
                    This team is suspended. Uploads are disabled, but existing files can still be downloaded.
                </div>
            )}

            {/* Upload section */}
            {team.status === "active" && (
                <Card className="border-border/50">
                    <CardContent className="p-4 space-y-3">
                        {/* File picker row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Upload className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Upload files</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatBytes(remainingStorage)} remaining
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading || remainingStorage <= 0}
                                >
                                    Select Files
                                </Button>
                                {selectedFiles.length > 0 && !uploading && (
                                    <Button size="sm" onClick={handleUploadAll}>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Selected files list */}
                        {selectedFiles.length > 0 && !uploading && (
                            <div className="rounded-lg border border-border/50 divide-y divide-border/50 max-h-64 overflow-y-auto">
                                {selectedFiles.map((item, idx) => (
                                    <div key={`${item.file.name}-${idx}`} className="px-3 py-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                <span className="truncate font-medium">{item.file.name}</span>
                                                <span className="text-xs text-muted-foreground flex-shrink-0">{formatBytes(item.file.size)}</span>
                                            </div>
                                            <button onClick={() => removeSelectedFile(idx)} className="text-muted-foreground hover:text-foreground p-0.5">
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateFileDescription(idx, e.target.value)}
                                            placeholder="Add a description (optional)"
                                            className="w-full text-xs px-2.5 py-1.5 rounded-md bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                                        />
                                    </div>
                                ))}
                                <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
                                    Total: {formatBytes(selectedTotalSize)}
                                    {selectedTotalSize > remainingStorage && (
                                        <span className="text-red-400 ml-2">Exceeds remaining storage</span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Upload progress */}
                        {uploading && uploadStats && (
                            <div className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden">
                                <div className="w-full bg-muted h-2">
                                    <div
                                        className="bg-green-400 h-2 transition-all duration-300 ease-out"
                                        style={{ width: `${uploadStats.percent}%` }}
                                    />
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">
                                                {uploadStats.currentFileName}
                                                {uploadStats.totalFiles > 1 && (
                                                    <span className="text-muted-foreground"> ({uploadStats.currentIndex}/{uploadStats.totalFiles})</span>
                                                )}
                                            </span>
                                        </div>
                                        <span className="text-sm font-mono font-medium tabular-nums flex-shrink-0 ml-3">
                                            {uploadStats.percent}%
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 border border-border/30">
                                            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Speed</p>
                                                <p className="text-xs font-mono font-medium tabular-nums truncate">{formatSpeed(uploadStats.speed)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 border border-border/30">
                                            <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Transferred</p>
                                                <p className="text-xs font-mono font-medium tabular-nums truncate">{formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 border border-border/30">
                                            <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Remaining</p>
                                                <p className="text-xs font-mono font-medium tabular-nums truncate">{formatTime(uploadStats.remaining)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground text-right">Elapsed: {formatTime(uploadStats.elapsed)}</p>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={handleFilesSelected}
                        />
                    </CardContent>
                </Card>
            )}

            {/* File List */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Files className="h-4 w-4 text-muted-foreground" />
                        Files
                        <Badge variant="secondary" className="text-[10px] ml-1">{files.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {files.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No files uploaded yet</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Uploaded By</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {files.map((file) => {
                                    const isOwner = file.uploadedBy?._id === session?.user?.id;
                                    return (
                                        <TableRow key={file._id} className="cursor-pointer" onClick={() => setDetailFile(file)}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-sm font-medium truncate block max-w-[200px]">
                                                            {file.fileName}
                                                        </span>
                                                        {file.description && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{file.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm tabular-nums">{formatBytes(file.fileSize)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{file.uploadedBy?.name || "Unknown"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(file.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => handleDownload(file)}
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {isOwner && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteFile(file)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* File Detail Dialog */}
            <Dialog open={!!detailFile} onOpenChange={(open) => { if (!open) setDetailFile(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    {detailFile && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    File Details
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="rounded-lg bg-muted/50 border border-border/50 p-4 space-y-3">
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">File Name</p>
                                        <p className="text-sm font-medium break-all">{detailFile.fileName}</p>
                                    </div>
                                    {detailFile.description && (
                                        <div>
                                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                                            <p className="text-sm">{detailFile.description}</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Size</p>
                                            <div className="flex items-center gap-1.5">
                                                <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                                                <p className="text-sm font-mono tabular-nums">{formatBytes(detailFile.fileSize)}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Uploaded</p>
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                <p className="text-sm">{new Date(detailFile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Uploaded By</p>
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                                            <p className="text-sm">{detailFile.uploadedBy?.name || "Unknown"}</p>
                                            {detailFile.uploadedBy?.email && (
                                                <span className="text-xs text-muted-foreground">({detailFile.uploadedBy.email})</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Content Type</p>
                                        <p className="text-sm font-mono text-muted-foreground">{detailFile.contentType}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setDetailFile(null)}>
                                        Close
                                    </Button>
                                    <Button className="flex-1" onClick={() => { handleDownload(detailFile); setDetailFile(null); }}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete File Dialog */}
            <Dialog open={!!deleteFile} onOpenChange={(open) => { if (!open) setDeleteFile(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {deleteFile && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete File
                                </DialogTitle>
                                <DialogDescription>
                                    This will permanently delete the file from team storage.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                <p className="font-medium truncate">{deleteFile.fileName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(deleteFile.fileSize)}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDeleteFile(null)} disabled={deletingFile}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" onClick={handleDeleteFile} disabled={deletingFile}>
                                    {deletingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
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
