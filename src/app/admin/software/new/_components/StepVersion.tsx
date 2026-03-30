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
import { Upload, X, FileArchive } from "lucide-react";

export interface VersionData {
    versionNumber: string;
    releaseNotes: string;
    platform: string;
    architecture: string;
    file: File | null;
}

interface StepVersionProps {
    data: VersionData;
    onChange: (data: VersionData) => void;
}

export default function StepVersion({ data, onChange }: StepVersionProps) {
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
                {data.file ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/50">
                        <FileArchive className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{data.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {(data.file.size / (1024 * 1024)).toFixed(2)} MB
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
