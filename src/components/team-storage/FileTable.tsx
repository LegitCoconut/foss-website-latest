"use client";

import { useMemo, useState } from "react";
import {
    FileIcon,
    Download,
    Trash2,
    Info,
    Calendar,
    Search,
    Image as ImageIcon,
    Video,
    FileText,
    File,
    Share2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { TeamFileItem } from "@/types";
import { getPreviewKind } from "@/lib/team-storage-config";
import { formatBytes } from "./utils";

interface FileTableProps {
    files: TeamFileItem[];
    canDelete: (file: TeamFileItem) => boolean;
    canShare?: (file: TeamFileItem) => boolean;
    onDownload: (file: TeamFileItem) => void;
    onDelete: (file: TeamFileItem) => void;
    onPreview: (file: TeamFileItem) => void;
    onInfo: (file: TeamFileItem) => void;
    onShare?: (file: TeamFileItem) => void;
}

type FilterType = "all" | "images" | "videos" | "pdfs" | "text" | "other";

function getFileIcon(contentType: string, fileName: string) {
    const kind = getPreviewKind(contentType, fileName);
    if (kind === "image") return ImageIcon;
    if (kind === "video") return Video;
    if (kind === "pdf" || kind === "text") return FileText;
    const ct = (contentType || "").toLowerCase();
    if (ct.startsWith("image/")) return ImageIcon;
    if (ct.startsWith("video/")) return Video;
    if (ct === "application/pdf" || ct.startsWith("text/")) return FileText;
    return File;
}

export function FileTable({
    files,
    canDelete,
    canShare,
    onDownload,
    onDelete,
    onPreview,
    onInfo,
    onShare,
}: FileTableProps) {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");

    const filteredFiles = useMemo(() => {
        const q = search.trim().toLowerCase();
        return files.filter((file) => {
            if (q) {
                const name = file.fileName?.toLowerCase() || "";
                const desc = file.description?.toLowerCase() || "";
                const uploader = file.uploadedBy?.name?.toLowerCase() || "";
                if (!name.includes(q) && !desc.includes(q) && !uploader.includes(q)) {
                    return false;
                }
            }
            if (filterType !== "all") {
                const kind = getPreviewKind(file.contentType, file.fileName);
                if (filterType === "images" && kind !== "image") return false;
                if (filterType === "videos" && kind !== "video") return false;
                if (filterType === "pdfs" && kind !== "pdf") return false;
                if (filterType === "text" && kind !== "text") return false;
                if (filterType === "other" && kind !== null) return false;
            }
            return true;
        });
    }, [files, search, filterType]);

    const hasFilter = search.trim().length > 0 || filterType !== "all";

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search files by name, description, or uploader"
                        className="pl-8 h-9"
                    />
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                    <SelectTrigger className="w-[140px] h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="images">Images</SelectItem>
                        <SelectItem value="videos">Videos</SelectItem>
                        <SelectItem value="pdfs">PDFs</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <Badge variant="secondary" className="text-[10px] ml-1">
                    {filteredFiles.length}
                </Badge>
            </div>

            {filteredFiles.length === 0 ? (
                <div className="p-12 text-center border border-border/50 rounded-lg">
                    <FileIcon className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {hasFilter ? "No files match your search" : "No files uploaded yet"}
                    </p>
                </div>
            ) : (
                <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>File</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Uploaded By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="w-[140px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredFiles.map((file) => {
                                const Icon = getFileIcon(file.contentType, file.fileName);
                                const previewable = getPreviewKind(file.contentType, file.fileName) !== null;
                                const showDelete = canDelete(file);
                                const showShare = canShare?.(file) ?? false;
                                return (
                                    <TableRow
                                        key={file._id}
                                        className="cursor-pointer"
                                        onClick={() => (previewable ? onPreview(file) : onInfo(file))}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium truncate block max-w-[240px]">
                                                        {file.fileName}
                                                    </span>
                                                    {file.description && (
                                                        <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                                                            {file.description}
                                                        </p>
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onInfo(file);
                                                    }}
                                                >
                                                    <Info className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDownload(file);
                                                    }}
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </Button>
                                                {showShare && onShare && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        title="Share for editing"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onShare(file);
                                                        }}
                                                    >
                                                        <Share2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                                {showDelete && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(file);
                                                        }}
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
                </div>
            )}
        </div>
    );
}
