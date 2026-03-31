"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, X, FileArchive, Loader2, ArrowUp, Clock, HardDrive, Trash2 } from "lucide-react";

export interface VersionFileEntry {
    file: File | null;
    platform: string;
    architecture: string;
}

export interface VersionData {
    versionNumber: string;
    releaseNotes: string;
    files: VersionFileEntry[];
    // Legacy fields kept for backward compat with draft loading
    platform: string;
    architecture: string;
    file: File | null;
}

export interface UploadStats {
    percent: number;
    loaded: number;
    total: number;
    speed: number;
    elapsed: number;
    remaining: number;
    currentFileName?: string;
    currentIndex?: number;
    totalFiles?: number;
}

interface StepVersionProps {
    data: VersionData;
    onChange: (data: VersionData) => void;
    uploadStats?: UploadStats | null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i > 1 ? 2 : 0)} ${units[i]}`;
}

function formatSpeed(bytesPerSec: number): string {
    if (bytesPerSec === 0) return "0 B/s";
    const units = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(1024));
    const val = bytesPerSec / Math.pow(1024, i);
    return `${val.toFixed(i > 1 ? 2 : 1)} ${units[i]}`;
}

function formatTime(seconds: number): string {
    if (seconds <= 0 || !isFinite(seconds)) return "--";
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.ceil(seconds % 60);
    return `${m}m ${s}s`;
}

export default function StepVersion({ data, onChange, uploadStats }: StepVersionProps) {
    function addFile() {
        onChange({
            ...data,
            files: [...data.files, { file: null, platform: "cross-platform", architecture: "x86_64" }],
        });
    }

    function updateFile(index: number, updates: Partial<VersionFileEntry>) {
        onChange({
            ...data,
            files: data.files.map((f, i) => i === index ? { ...f, ...updates } : f),
        });
    }

    function removeFile(index: number) {
        onChange({
            ...data,
            files: data.files.filter((_, i) => i !== index),
        });
    }

    const isUploading = uploadStats !== null && uploadStats !== undefined;

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Add an initial version for this software. You can add multiple files for different platforms. You can also skip this step and add versions later.
            </p>

            <div className="space-y-2">
                <Label htmlFor="versionNumber">Version Number</Label>
                <Input
                    id="versionNumber"
                    value={data.versionNumber}
                    onChange={(e) => onChange({ ...data, versionNumber: e.target.value })}
                    placeholder="e.g., 1.0.0"
                    className="bg-muted/50 border-border/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="releaseNotes">Release Notes</Label>
                <Textarea
                    id="releaseNotes"
                    value={data.releaseNotes}
                    onChange={(e) => onChange({ ...data, releaseNotes: e.target.value })}
                    placeholder="What's new in this version..."
                    rows={3}
                    className="bg-muted/50 border-border/50"
                />
            </div>

            {/* Upload progress */}
            {isUploading && (
                <div className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden">
                    <div className="w-full bg-muted h-2">
                        <div
                            className="bg-foreground h-2 transition-all duration-300 ease-out"
                            style={{ width: `${uploadStats.percent}%` }}
                        />
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
                                <span className="text-sm font-medium truncate">
                                    {uploadStats.currentFileName || "Uploading..."}
                                    {uploadStats.totalFiles && uploadStats.totalFiles > 1 && (
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

            {/* File entries */}
            {!isUploading && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Files</Label>
                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addFile}>
                            <Plus className="h-3 w-3 mr-1" /> Add File
                        </Button>
                    </div>

                    {data.files.length === 0 && (
                        <button
                            type="button"
                            onClick={addFile}
                            className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center gap-2 hover:border-foreground/30 transition-colors"
                        >
                            <FileArchive className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Click to add a file</span>
                        </button>
                    )}

                    {data.files.map((entry, i) => (
                        <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                {entry.file ? (
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileArchive className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{entry.file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatBytes(entry.file.size)}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <Input
                                        type="file"
                                        className="bg-muted/50 border-border/50 flex-1 text-xs"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) updateFile(i, { file });
                                        }}
                                    />
                                )}
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                                    onClick={() => removeFile(i)}
                                >
                                    {entry.file ? <X className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <Select value={entry.platform} onValueChange={(v) => updateFile(i, { platform: v })}>
                                    <SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="windows">Windows</SelectItem>
                                        <SelectItem value="linux">Linux</SelectItem>
                                        <SelectItem value="macos">macOS (Intel)</SelectItem>
                                        <SelectItem value="macos-arm">macOS (Apple Silicon)</SelectItem>
                                        <SelectItem value="cross-platform">Cross-platform</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select value={entry.architecture} onValueChange={(v) => updateFile(i, { architecture: v })}>
                                    <SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="x86_64">x86_64</SelectItem>
                                        <SelectItem value="arm64">ARM64</SelectItem>
                                        <SelectItem value="universal">Universal</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
