"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
    Upload,
    FileIcon,
    X,
    ArrowUp,
    HardDrive,
    Clock,
    Loader2,
    Info,
    ChevronDown,
    Image as ImageIcon,
    Video,
    FileText,
    Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { TeamItem } from "@/types";
import { SYSTEM_MAX_FILE_SIZE } from "@/lib/team-storage-config";
import { formatBytes, formatSpeed, formatTime } from "./utils";

interface UploadPanelProps {
    teamId: string;
    team: TeamItem;
    disabled?: boolean;
    onUploaded: () => void;
    onNewTextFile?: () => void;
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

export function UploadPanel({ teamId, team, disabled = false, onUploaded, onNewTextFile }: UploadPanelProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFiles, setSelectedFiles] = useState<{ file: File; description: string }[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);

    const remainingStorage = Math.max(team.storageLimit - team.totalStorageUsed, 0);
    const effectiveMaxFileSize = team.maxFileSize ?? SYSTEM_MAX_FILE_SIZE;
    const selectedTotalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);

    function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const newFiles = Array.from(e.target.files || []);
        e.target.value = "";
        if (newFiles.length === 0) return;
        setSelectedFiles((prev) => [
            ...prev,
            ...newFiles.map((f) => ({ file: f, description: "" })),
        ]);
    }

    function removeSelectedFile(index: number) {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function updateFileDescription(index: number, description: string) {
        setSelectedFiles((prev) =>
            prev.map((item, i) => (i === index ? { ...item, description } : item))
        );
    }

    async function handleUploadAll() {
        if (selectedFiles.length === 0) return;

        // Validate each file against effective max file size
        const oversized = selectedFiles.find((f) => f.file.size > effectiveMaxFileSize);
        if (oversized) {
            toast.error(
                `${oversized.file.name} exceeds the max file size of ${formatBytes(effectiveMaxFileSize)}`
            );
            return;
        }

        const totalSize = selectedFiles.reduce((sum, f) => sum + f.file.size, 0);
        if (totalSize > remainingStorage) {
            toast.error(
                `Total size (${formatBytes(totalSize)}) exceeds remaining storage (${formatBytes(remainingStorage)})`
            );
            return;
        }

        setUploading(true);
        let successCount = 0;

        for (let i = 0; i < selectedFiles.length; i++) {
            const { file, description } = selectedFiles[i];

            setUploadStats({
                percent: 0,
                loaded: 0,
                total: file.size,
                speed: 0,
                elapsed: 0,
                remaining: 0,
                currentFileName: file.name,
                currentIndex: i + 1,
                totalFiles: selectedFiles.length,
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
                            smoothSpeed =
                                smoothSpeed === 0
                                    ? intervalSpeed
                                    : smoothSpeed * 0.7 + intervalSpeed * 0.3;
                            lastLoaded = e.loaded;
                            lastTime = now;
                        }
                        setUploadStats({
                            percent: Math.round((e.loaded / e.total) * 100),
                            loaded: e.loaded,
                            total: e.total,
                            speed: smoothSpeed,
                            elapsed: elapsedMs / 1000,
                            remaining:
                                smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0,
                            currentFileName: file.name,
                            currentIndex: i + 1,
                            totalFiles: selectedFiles.length,
                        });
                    });
                    xhr.addEventListener("load", () =>
                        resolve(xhr.status >= 200 && xhr.status < 300)
                    );
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.open("PUT", presignData.uploadUrl);
                    xhr.setRequestHeader(
                        "Content-Type",
                        file.type || "application/octet-stream"
                    );
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
        onUploaded();
    }

    return (
        <Card className="border-border/50">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">Upload files</p>
                            <p className="text-xs text-muted-foreground">
                                {formatBytes(remainingStorage)} remaining
                                {team.maxFileSize && (
                                    <span> · max {formatBytes(effectiveMaxFileSize)} per file</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={disabled || uploading || remainingStorage <= 0}
                        >
                            Select Files
                        </Button>
                        {onNewTextFile && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onNewTextFile}
                                disabled={disabled || uploading || remainingStorage <= 0}
                            >
                                New Text File
                            </Button>
                        )}
                        {selectedFiles.length > 0 && !uploading && (
                            <Button size="sm" onClick={handleUploadAll} disabled={disabled}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload {selectedFiles.length} file
                                {selectedFiles.length > 1 ? "s" : ""}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Collapsible info */}
                <div className="rounded-lg border border-border/50 bg-muted/30 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setInfoOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                            <Info className="h-3.5 w-3.5" />
                            <span className="font-medium">Supported file types &amp; in-browser features</span>
                        </div>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${infoOpen ? "rotate-180" : ""}`} />
                    </button>
                    {infoOpen && (
                        <div className="border-t border-border/50 px-3 py-3 space-y-3 text-xs">
                            <div>
                                <div className="flex items-center gap-1.5 text-foreground font-medium mb-1.5">
                                    <Pencil className="h-3.5 w-3.5 text-green-500" />
                                    Create / edit in browser
                                </div>
                                <p className="text-muted-foreground leading-relaxed">
                                    Click <span className="text-foreground font-medium">New Text File</span> to create plain-text files with syntax highlighting. Editable file types:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {["txt", "md", "json", "yaml", "js", "ts", "jsx", "tsx", "py", "html", "css", "sh", "xml", "csv", "log"].map((ext) => (
                                        <code key={ext} className="px-1.5 py-0.5 rounded bg-background/50 border border-border/30 text-[10px] font-mono text-muted-foreground">
                                            .{ext}
                                        </code>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-1.5 text-foreground font-medium mb-1.5">
                                    <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
                                    Preview in browser
                                </div>
                                <p className="text-muted-foreground leading-relaxed mb-1.5">
                                    Click a file in the table below to open a full preview — no download needed.
                                </p>
                                <ul className="space-y-1 text-muted-foreground">
                                    <li className="flex items-center gap-1.5">
                                        <ImageIcon className="h-3 w-3 text-muted-foreground/70" />
                                        <span><span className="text-foreground">Images</span> — png, jpg, jpeg, gif, webp, bmp</span>
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <Video className="h-3 w-3 text-muted-foreground/70" />
                                        <span><span className="text-foreground">Videos</span> — mp4, webm, mov, mkv (with playback controls)</span>
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <FileText className="h-3 w-3 text-muted-foreground/70" />
                                        <span><span className="text-foreground">PDFs</span> — continuous scroll, zoomable</span>
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <FileText className="h-3 w-3 text-muted-foreground/70" />
                                        <span><span className="text-foreground">Text files</span> — all the extensions listed above</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="text-[11px] text-muted-foreground/70 border-t border-border/50 pt-2">
                                Other file types (zip, doc, exe, etc.) can still be uploaded and downloaded, but won&apos;t preview in the browser.
                            </div>
                        </div>
                    )}
                </div>

                {selectedFiles.length > 0 && !uploading && (
                    <div className="rounded-lg border border-border/50 divide-y divide-border/50 max-h-64 overflow-y-auto">
                        {selectedFiles.map((item, idx) => {
                            const oversized = item.file.size > effectiveMaxFileSize;
                            return (
                                <div key={`${item.file.name}-${idx}`} className="px-3 py-2.5 space-y-1.5">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <span className="truncate font-medium">{item.file.name}</span>
                                            <span className={`text-xs flex-shrink-0 ${oversized ? "text-red-400" : "text-muted-foreground"}`}>
                                                {formatBytes(item.file.size)}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeSelectedFile(idx)}
                                            className="text-muted-foreground hover:text-foreground p-0.5"
                                        >
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
                            );
                        })}
                        <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
                            Total: {formatBytes(selectedTotalSize)}
                            {selectedTotalSize > remainingStorage && (
                                <span className="text-red-400 ml-2">Exceeds remaining storage</span>
                            )}
                        </div>
                    </div>
                )}

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
                                            <span className="text-muted-foreground">
                                                {" "}
                                                ({uploadStats.currentIndex}/{uploadStats.totalFiles})
                                            </span>
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
                                        <p className="text-xs font-mono font-medium tabular-nums truncate">
                                            {formatSpeed(uploadStats.speed)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 border border-border/30">
                                    <HardDrive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Transferred</p>
                                        <p className="text-xs font-mono font-medium tabular-nums truncate">
                                            {formatBytes(uploadStats.loaded)} / {formatBytes(uploadStats.total)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-2 border border-border/30">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Remaining</p>
                                        <p className="text-xs font-mono font-medium tabular-nums truncate">
                                            {formatTime(uploadStats.remaining)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground text-right">
                                Elapsed: {formatTime(uploadStats.elapsed)}
                            </p>
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
    );
}
