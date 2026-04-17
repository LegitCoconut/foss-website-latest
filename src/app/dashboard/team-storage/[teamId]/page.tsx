"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
    Trash2,
    ChevronLeft,
    Loader2,
    AlertTriangle,
    FileIcon,
    Calendar,
    Ban,
    User,
    HardDrive,
    Download,
    Upload,
    FilePlus,
    Info,
    Users,
    Share2,
    Image as ImageIcon,
    Video,
    FileText,
    File as FileLucide,
    Search,
    Grid3x3,
    List as ListIcon,
    ArrowUp,
    Clock,
    Pencil,
} from "lucide-react";
import type { TeamItem, TeamFileItem } from "@/types";
import { getPreviewKind, SYSTEM_MAX_FILE_SIZE } from "@/lib/team-storage-config";
import { FileViewerModal } from "@/components/team-storage/FileViewerModal";
import { TextEditor } from "@/components/team-storage/TextEditor";
import { ShareDialog } from "@/components/team-storage/ShareDialog";
import { formatBytes, formatSpeed, formatTime } from "@/components/team-storage/utils";

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

function getFileKindIcon(contentType: string, fileName: string) {
    const kind = getPreviewKind(contentType, fileName);
    if (kind === "image") return ImageIcon;
    if (kind === "video") return Video;
    if (kind === "pdf" || kind === "text") return FileText;
    return FileLucide;
}

function getFileIconColor(contentType: string, fileName: string) {
    const kind = getPreviewKind(contentType, fileName);
    if (kind === "image") return "text-blue-500";
    if (kind === "video") return "text-purple-500";
    if (kind === "pdf") return "text-red-500";
    if (kind === "text") return "text-green-500";
    return "text-muted-foreground";
}

export default function TeamFileManagerPage() {
    const { teamId } = useParams<{ teamId: string }>();
    const { data: session } = useSession();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [team, setTeam] = useState<TeamItem | null>(null);
    const [files, setFiles] = useState<TeamFileItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Upload state
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; description: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

    // File viewer / editor state
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [editorState, setEditorState] = useState<{
        mode: "create" | "edit";
        fileId?: string;
        fileName?: string;
        initialContent?: string;
    } | null>(null);

    // Details + delete + share dialogs
    const [detailFile, setDetailFile] = useState<TeamFileItem | null>(null);
    const [deleteFile, setDeleteFile] = useState<TeamFileItem | null>(null);
    const [deletingFile, setDeletingFile] = useState(false);
    const [shareFile, setShareFile] = useState<TeamFileItem | null>(null);

    // Filter / view state — grid is always the default on page load
    const [search, setSearch] = useState("");
    const [view, setView] = useState<"grid" | "list">("grid");
    function changeView(v: "grid" | "list") { setView(v); }

    useEffect(() => {
        fetchTeamData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // ----- Upload flow -----
    function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const newFiles = Array.from(e.target.files || []);
        e.target.value = "";
        if (newFiles.length === 0) return;
        setSelectedFiles((prev) => [...prev, ...newFiles.map((f) => ({ file: f, description: "" }))]);
        setUploadDialogOpen(true);
    }

    async function handleUploadAll() {
        if (!team || selectedFiles.length === 0) return;
        const effectiveMax = team.maxFileSize ?? SYSTEM_MAX_FILE_SIZE;
        const oversized = selectedFiles.find((f) => f.file.size > effectiveMax);
        if (oversized) {
            toast.error(`${oversized.file.name} exceeds the max file size of ${formatBytes(effectiveMax)}`);
            return;
        }

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
                            loaded: e.loaded, total: e.total, speed: smoothSpeed,
                            elapsed: elapsedMs / 1000,
                            remaining: smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0,
                            currentFileName: file.name, currentIndex: i + 1, totalFiles: selectedFiles.length,
                        });
                    });
                    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.open("PUT", presignData.uploadUrl);
                    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                    xhr.send(file);
                });

                if (ok) successCount++;
                else toast.error(`${file.name}: Upload failed`);
            } catch {
                toast.error(`${file.name}: Upload failed`);
            }
        }

        if (successCount > 0) toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded`);
        setSelectedFiles([]);
        setUploading(false);
        setUploadStats(null);
        setUploadDialogOpen(false);
        fetchTeamData();
    }

    // ----- File actions -----
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

    // Permission helpers
    function isOwner(f: TeamFileItem) {
        return f.uploadedBy?._id === session?.user?.id;
    }
    function isSharedWith(f: TeamFileItem) {
        if (!f.sharedWith) return false;
        return f.sharedWith.some((u) =>
            typeof u === "string" ? u === session?.user?.id : u._id === session?.user?.id
        );
    }
    function canEditFile(f: TeamFileItem) {
        return team?.status === "active" && (isOwner(f) || isSharedWith(f));
    }

    // Previewable files
    const previewableFiles = files.filter((f) => getPreviewKind(f.contentType, f.fileName) !== null);

    function handlePreview(file: TeamFileItem) {
        const idx = previewableFiles.findIndex((f) => f._id === file._id);
        if (idx !== -1) setViewerIndex(idx);
        else setDetailFile(file);
    }

    // Filter files
    const filteredFiles = files.filter((f) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            f.fileName.toLowerCase().includes(q) ||
            (f.description || "").toLowerCase().includes(q) ||
            (f.uploadedBy?.name || "").toLowerCase().includes(q)
        );
    });

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-96" />
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
    const canUpload = team.status === "active";

    return (
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
            {/* Top toolbar */}
            <div className="border-b border-border/50 bg-background/80 backdrop-blur">
                <div className="flex items-center gap-4 px-4 py-3">
                    {/* Back + team info */}
                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" asChild>
                        <Link href="/dashboard/team-storage">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>

                    <FolderArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold truncate">{team.name}</h1>
                            {team.status === "suspended" && (
                                <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                                    <Ban className="h-2.5 w-2.5 mr-1" />
                                    Suspended
                                </Badge>
                            )}
                        </div>
                        {team.description && (
                            <p className="text-xs text-muted-foreground truncate">{team.description}</p>
                        )}
                    </div>

                    {/* Inline stats */}
                    <div className="hidden md:flex items-center gap-5 ml-auto text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span className="tabular-nums">{team.memberCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                            <FileIcon className="h-3.5 w-3.5" />
                            <span className="tabular-nums">{files.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-400/60"}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums">
                                {formatBytes(team.totalStorageUsed)} / {formatBytes(team.storageLimit)}
                            </span>
                        </div>
                    </div>

                    {/* Action icons */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-auto md:ml-0">
                        {canUpload && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Upload files"
                                >
                                    <Upload className="h-4 w-4 mr-1.5" />
                                    Upload
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setEditorState({ mode: "create" })}
                                    title="New text file"
                                >
                                    <FilePlus className="h-4 w-4 mr-1.5" />
                                    New
                                </Button>
                            </>
                        )}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9" title="Supported file types">
                                    <Info className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-4 space-y-3">
                                <div>
                                    <div className="flex items-center gap-1.5 text-foreground font-medium mb-1.5 text-sm">
                                        <Pencil className="h-3.5 w-3.5 text-green-500" />
                                        Create / edit in browser
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Click <span className="text-foreground font-medium">New</span> to create plain-text files with syntax highlighting.
                                    </p>
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                        {["txt", "md", "json", "yaml", "js", "ts", "py", "html", "css", "sh"].map((ext) => (
                                            <code key={ext} className="px-1.5 py-0.5 rounded bg-muted border border-border/30 text-[10px] font-mono text-muted-foreground">
                                                .{ext}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5 text-foreground font-medium mb-1.5 text-sm">
                                        <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                                        Preview in browser
                                    </div>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                        <li>• Images — png, jpg, gif, webp</li>
                                        <li>• Videos — mp4, webm, mov (with controls)</li>
                                        <li>• PDFs — continuous scroll, zoomable</li>
                                        <li>• Text files — all listed extensions</li>
                                    </ul>
                                </div>
                                <div className="text-[11px] text-muted-foreground/70 border-t border-border/50 pt-2">
                                    Sharing a file lets teammates edit it. Only the owner (or an admin) can delete.
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                {/* Secondary toolbar: search + view */}
                <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-8 h-8 text-sm bg-muted/50 border-border/50"
                        />
                    </div>
                    <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                        <button
                            onClick={() => changeView("grid")}
                            className={`p-1.5 transition-colors ${view === "grid" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            title="Grid view"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => changeView("list")}
                            className={`p-1.5 transition-colors ${view === "list" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                            title="List view"
                        >
                            <ListIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground ml-auto">
                        {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            {/* Suspended banner */}
            {team.status === "suspended" && (
                <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 flex items-center gap-2 text-xs text-red-400">
                    <Ban className="h-3.5 w-3.5 flex-shrink-0" />
                    Team is suspended. Uploads disabled, existing files can be downloaded.
                </div>
            )}

            {/* Main file area */}
            <div className="flex-1 overflow-auto">
                {filteredFiles.length === 0 ? (
                    <div className="flex items-center justify-center h-full p-12 text-center">
                        <div>
                            <FolderArchive className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                            <p className="text-muted-foreground">
                                {files.length === 0 ? "This team has no files yet" : "No files match your search"}
                            </p>
                            {canUpload && files.length === 0 && (
                                <div className="flex items-center gap-2 justify-center mt-4">
                                    <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="h-4 w-4 mr-1.5" />
                                        Upload files
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditorState({ mode: "create" })}>
                                        <FilePlus className="h-4 w-4 mr-1.5" />
                                        Create text file
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : view === "grid" ? (
                    /* Grid view with right-click context menu */
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredFiles.map((file) => {
                            const Icon = getFileKindIcon(file.contentType, file.fileName);
                            const colorClass = getFileIconColor(file.contentType, file.fileName);
                            const showDelete = isOwner(file) || (session?.user as { role?: string })?.role === "admin";
                            const showShare = isOwner(file) && team.status === "active";
                            return (
                                <ContextMenu key={file._id}>
                                    <ContextMenuTrigger>
                                        <div
                                            onClick={() => handlePreview(file)}
                                            className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer select-none"
                                        >
                                            <div className="w-20 h-24 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-center flex-shrink-0 group-hover:border-border">
                                                <Icon className={`h-10 w-10 ${colorClass}`} />
                                            </div>
                                            <p className="text-xs font-medium text-center line-clamp-2 break-all w-full">
                                                {file.fileName}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground tabular-nums">
                                                {formatBytes(file.fileSize)}
                                            </p>
                                        </div>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent className="w-48">
                                        <ContextMenuItem onSelect={() => handlePreview(file)}>
                                            <FileIcon className="h-3.5 w-3.5 mr-2" />
                                            Open
                                        </ContextMenuItem>
                                        <ContextMenuItem onSelect={() => handleDownload(file)}>
                                            <Download className="h-3.5 w-3.5 mr-2" />
                                            Download
                                        </ContextMenuItem>
                                        <ContextMenuItem onSelect={() => setDetailFile(file)}>
                                            <Info className="h-3.5 w-3.5 mr-2" />
                                            Details
                                        </ContextMenuItem>
                                        {(showShare || showDelete) && <ContextMenuSeparator />}
                                        {showShare && (
                                            <ContextMenuItem onSelect={() => setShareFile(file)}>
                                                <Share2 className="h-3.5 w-3.5 mr-2" />
                                                Share
                                            </ContextMenuItem>
                                        )}
                                        {showDelete && (
                                            <ContextMenuItem
                                                onSelect={() => setDeleteFile(file)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                Delete
                                            </ContextMenuItem>
                                        )}
                                    </ContextMenuContent>
                                </ContextMenu>
                            );
                        })}
                    </div>
                ) : (
                    /* List view — table layout with always-visible actions */
                    <div className="p-2">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Name</TableHead>
                                    <TableHead className="hidden md:table-cell w-[20%]">Uploaded by</TableHead>
                                    <TableHead className="hidden md:table-cell w-[12%] text-right">Size</TableHead>
                                    <TableHead className="hidden md:table-cell w-[12%]">Date</TableHead>
                                    <TableHead className="w-[16%] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFiles.map((file) => {
                                    const Icon = getFileKindIcon(file.contentType, file.fileName);
                                    const colorClass = getFileIconColor(file.contentType, file.fileName);
                                    const showDelete = isOwner(file) || (session?.user as { role?: string })?.role === "admin";
                                    const showShare = isOwner(file) && team.status === "active";
                                    return (
                                        <TableRow
                                            key={file._id}
                                            onClick={() => handlePreview(file)}
                                            className="cursor-pointer"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Icon className={`h-4 w-4 ${colorClass} flex-shrink-0`} />
                                                    <div className="min-w-0">
                                                        <p className="text-sm truncate">{file.fileName}</p>
                                                        {file.description && (
                                                            <p className="text-xs text-muted-foreground truncate">{file.description}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-sm text-muted-foreground truncate">{file.uploadedBy?.name || "Unknown"}</span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-right">
                                                <span className="text-sm tabular-nums text-muted-foreground">{formatBytes(file.fileSize)}</span>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-sm text-muted-foreground">{new Date(file.createdAt).toLocaleDateString()}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="flex items-center justify-end gap-0.5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Details" onClick={() => setDetailFile(file)}>
                                                        <Info className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => handleDownload(file)}>
                                                        <Download className="h-3.5 w-3.5" />
                                                    </Button>
                                                    {showShare && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Share" onClick={() => setShareFile(file)}>
                                                            <Share2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    {showDelete && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeleteFile(file)}>
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
                    </div>
                )}
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
            />

            {/* Upload Dialog */}
            <Dialog open={uploadDialogOpen} onOpenChange={(open) => { if (!open && !uploading) setUploadDialogOpen(false); }}>
                <DialogContent className="border-border/50 bg-background max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Upload files
                        </DialogTitle>
                        <DialogDescription>
                            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected · {formatBytes(selectedFiles.reduce((s, f) => s + f.file.size, 0))} total
                        </DialogDescription>
                    </DialogHeader>

                    {!uploading ? (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {selectedFiles.map((item, idx) => (
                                <div key={idx} className="rounded-lg border border-border/50 bg-muted/30 p-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <span className="text-sm font-medium truncate">{item.file.name}</span>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">{formatBytes(item.file.size)}</span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <Input
                                        placeholder="Description (optional)"
                                        value={item.description}
                                        onChange={(e) => setSelectedFiles(selectedFiles.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                                        className="h-7 text-xs bg-muted/50 border-border/50"
                                    />
                                </div>
                            ))}
                        </div>
                    ) : uploadStats && (
                        <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                            <div className="w-full bg-muted h-2">
                                <div className="bg-green-400 h-2 transition-all" style={{ width: `${uploadStats.percent}%` }} />
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm font-medium truncate">
                                            {uploadStats.currentFileName}
                                            {uploadStats.totalFiles > 1 && <span className="text-muted-foreground"> ({uploadStats.currentIndex}/{uploadStats.totalFiles})</span>}
                                        </span>
                                    </div>
                                    <span className="text-sm font-mono tabular-nums">{uploadStats.percent}%</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3" />{formatSpeed(uploadStats.speed)}</span>
                                    <span>{formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(uploadStats.remaining)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setUploadDialogOpen(false)} disabled={uploading}>
                            Cancel
                        </Button>
                        {!uploading && (
                            <Button className="flex-1" onClick={handleUploadAll} disabled={selectedFiles.length === 0}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* File Viewer */}
            {viewerIndex !== null && (
                <FileViewerModal
                    files={previewableFiles}
                    startIndex={viewerIndex}
                    teamId={teamId}
                    onClose={() => setViewerIndex(null)}
                    onDownload={handleDownload}
                    canEdit={(f) => canEditFile(f)}
                    onEdit={(file, content) => {
                        setViewerIndex(null);
                        setEditorState({
                            mode: "edit",
                            fileId: file._id,
                            fileName: file.fileName,
                            initialContent: content,
                        });
                    }}
                />
            )}

            {/* Text Editor */}
            {editorState && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
                    onClick={(e) => { if (e.target === e.currentTarget) setEditorState(null); }}
                >
                    <TextEditor
                        teamId={teamId}
                        mode={editorState.mode}
                        fileId={editorState.fileId}
                        fileName={editorState.fileName}
                        initialContent={editorState.initialContent}
                        onSaved={() => { setEditorState(null); fetchTeamData(); }}
                        onCancel={() => setEditorState(null)}
                    />
                </div>
            )}

            {/* Share Dialog */}
            <ShareDialog
                teamId={teamId}
                file={shareFile}
                members={team.members || []}
                onClose={() => setShareFile(null)}
                onSaved={fetchTeamData}
            />

            {/* Details Dialog */}
            <Dialog open={!!detailFile} onOpenChange={(open) => { if (!open) setDetailFile(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    {detailFile && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                    File details
                                </DialogTitle>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-4 space-y-3">
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Name</p>
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
                                        <p className="text-sm font-mono tabular-nums">{formatBytes(detailFile.fileSize)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Uploaded</p>
                                        <p className="text-sm">{new Date(detailFile.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Uploader</p>
                                    <p className="text-sm">{detailFile.uploadedBy?.name || "Unknown"}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">Type</p>
                                    <p className="text-sm font-mono text-muted-foreground">{detailFile.contentType}</p>
                                </div>
                                {detailFile.sharedWith && detailFile.sharedWith.length > 0 && (
                                    <div>
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Shared with</p>
                                        <div className="flex flex-wrap gap-1">
                                            {detailFile.sharedWith.map((u) => {
                                                const name = typeof u === "string" ? u : u.name;
                                                const id = typeof u === "string" ? u : u._id;
                                                return (
                                                    <Badge key={id} variant="secondary" className="text-[10px]">
                                                        {name}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDetailFile(null)}>Close</Button>
                                <Button className="flex-1" onClick={() => { handleDownload(detailFile); setDetailFile(null); }}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </Button>
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
                                    Delete file
                                </DialogTitle>
                                <DialogDescription>
                                    Permanently delete this file from team storage.
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
