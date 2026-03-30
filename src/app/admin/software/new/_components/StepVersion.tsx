"use client";

import { useRef } from "react";
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
import { Upload, X, FileArchive, Loader2, ArrowUp, Clock, HardDrive } from "lucide-react";

export interface VersionData {
    versionNumber: string;
    releaseNotes: string;
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    function update(field: keyof VersionData, value: string) {
        onChange({ ...data, [field]: value });
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            onChange({ ...data, file });
        }
    }

    function clearFile() {
        onChange({ ...data, file: null });
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    const isUploading = uploadStats !== null && uploadStats !== undefined;

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Add an initial version for this software. You can skip this step and add versions later.
            </p>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="versionNumber">Version Number</Label>
                    <Input
                        id="versionNumber"
                        value={data.versionNumber}
                        onChange={(e) => update("versionNumber", e.target.value)}
                        placeholder="e.g., 1.0.0"
                        className="bg-muted/50 border-border/50"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select value={data.platform} onValueChange={(v) => update("platform", v)}>
                        <SelectTrigger className="bg-muted/50 border-border/50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="windows">Windows</SelectItem>
                            <SelectItem value="linux">Linux</SelectItem>
                            <SelectItem value="macos">macOS</SelectItem>
                            <SelectItem value="cross-platform">Cross-platform</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label>Architecture</Label>
                <Select value={data.architecture} onValueChange={(v) => update("architecture", v)}>
                    <SelectTrigger className="bg-muted/50 border-border/50 w-1/2">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="x86_64">x86_64</SelectItem>
                        <SelectItem value="arm64">arm64</SelectItem>
                        <SelectItem value="universal">Universal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="releaseNotes">Release Notes</Label>
                <Textarea
                    id="releaseNotes"
                    value={data.releaseNotes}
                    onChange={(e) => update("releaseNotes", e.target.value)}
                    placeholder="What's new in this version..."
                    rows={3}
                    className="bg-muted/50 border-border/50"
                />
            </div>

            <div className="space-y-2">
                <Label>File Upload</Label>
                {isUploading ? (
                    <div className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden">
                        {/* Progress bar */}
                        <div className="w-full bg-muted h-2">
                            <div
                                className="bg-foreground h-2 transition-all duration-300 ease-out"
                                style={{ width: `${uploadStats.percent}%` }}
                            />
                        </div>

                        <div className="p-4 space-y-3">
                            {/* File name and percentage */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
                                    <span className="text-sm font-medium truncate">{data.file?.name}</span>
                                </div>
                                <span className="text-sm font-mono font-medium tabular-nums flex-shrink-0 ml-3">
                                    {uploadStats.percent}%
                                </span>
                            </div>

                            {/* Stats grid */}
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

                            {/* Elapsed time */}
                            <p className="text-[11px] text-muted-foreground text-right">
                                Elapsed: {formatTime(uploadStats.elapsed)}
                            </p>
                        </div>
                    </div>
                ) : data.file ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/50">
                        <FileArchive className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{data.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatBytes(data.file.size)}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={clearFile}
                            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-6 rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center gap-2 hover:border-foreground/30 transition-colors"
                    >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload the software file</span>
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>
        </div>
    );
}
