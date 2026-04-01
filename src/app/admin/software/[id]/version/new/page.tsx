"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    ArrowLeft,
    ArrowRight,
    Plus,
    Trash2,
    Upload,
    Loader2,
    FileArchive,
    HardDrive,
    Check,
} from "lucide-react";

interface PendingFile {
    file: File | null;
    platform: string;
    architecture: string;
}

function formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
}

function formatSpeed(bps: number): string {
    if (bps === 0) return "0 B/s";
    const u = ["B/s", "KB/s", "MB/s", "GB/s"];
    const i = Math.floor(Math.log(bps) / Math.log(1024));
    return (bps / Math.pow(1024, i)).toFixed(1) + " " + u[i];
}

function formatTime(s: number): string {
    if (s <= 0 || !isFinite(s)) return "--";
    if (s < 60) return `${Math.ceil(s)}s`;
    return `${Math.floor(s / 60)}m ${Math.ceil(s % 60)}s`;
}

export default function AddVersionPage() {
    const params = useParams();
    const router = useRouter();
    const softwareId = params.id as string;

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Step 1
    const [versionNumber, setVersionNumber] = useState("");
    const [releaseNotes, setReleaseNotes] = useState("");

    // Step 2
    const [files, setFiles] = useState<PendingFile[]>([]);
    const [uploadProgress, setUploadProgress] = useState<{
        percent: number; loaded: number; total: number; speed: number;
        remaining: number; fileName: string; index: number; totalFiles: number;
    } | null>(null);

    function addFile() {
        setFiles([...files, { file: null, platform: "cross-platform", architecture: "x86_64" }]);
    }

    function updateFile(i: number, updates: Partial<PendingFile>) {
        setFiles(files.map((f, j) => j === i ? { ...f, ...updates } : f));
    }

    function removeFile(i: number) {
        setFiles(files.filter((_, j) => j !== i));
    }

    async function handleSubmit() {
        const validFiles = files.filter((f) => f.file && f.file.size > 0);
        if (validFiles.length === 0) {
            toast.error("Please add at least one file");
            return;
        }
        setSaving(true);

        try {
            const uploaded = [];
            for (let i = 0; i < validFiles.length; i++) {
                const pf = validFiles[i];
                const file = pf.file!;

                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }),
                });
                if (!presignRes.ok) { toast.error(`Failed to prepare ${file.name}`); setSaving(false); return; }
                const { uploadUrl, key } = await presignRes.json();

                setUploadProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, remaining: 0, fileName: file.name, index: i + 1, totalFiles: validFiles.length });
                const ok = await new Promise<boolean>((resolve) => {
                    const start = Date.now();
                    let lastLoaded = 0, lastTime = start, smooth = 0;
                    const xhr = new XMLHttpRequest();
                    xhr.upload.addEventListener("progress", (e) => {
                        if (!e.lengthComputable) return;
                        const now = Date.now(), ms = now - lastTime;
                        if (ms > 100) {
                            const spd = ((e.loaded - lastLoaded) / ms) * 1000;
                            smooth = smooth === 0 ? spd : smooth * 0.7 + spd * 0.3;
                            lastLoaded = e.loaded; lastTime = now;
                        }
                        setUploadProgress({ percent: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed: smooth, remaining: smooth > 0 ? (e.total - e.loaded) / smooth : 0, fileName: file.name, index: i + 1, totalFiles: validFiles.length });
                    });
                    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.open("PUT", uploadUrl);
                    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
                    xhr.send(file);
                });
                setUploadProgress(null);
                if (!ok) { toast.error(`Upload failed for ${file.name}`); setSaving(false); return; }

                uploaded.push({ fileKey: key, fileName: file.name, fileSize: file.size, platform: pf.platform, architecture: pf.architecture });
            }

            const res = await fetch(`/api/software/${softwareId}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ versionNumber, releaseNotes, files: uploaded }),
            });
            if (res.ok) {
                toast.success("Version created!");
                router.push(`/admin/software/${softwareId}`);
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to create version");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    const steps = [
        { num: 1, label: "Version Info" },
        { num: 2, label: "Files" },
    ];

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/software/${softwareId}`)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Add New Version</h1>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-3 mb-8">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center gap-3">
                        <button
                            onClick={() => { if (s.num < step || (s.num === 2 && versionNumber.trim())) setStep(s.num); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                step === s.num ? "bg-foreground/[0.08] text-foreground" :
                                s.num < step ? "text-foreground" : "text-muted-foreground"
                            }`}
                        >
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                s.num < step ? "bg-foreground text-background" :
                                step === s.num ? "bg-foreground/20 text-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                                {s.num < step ? <Check className="h-3.5 w-3.5" /> : s.num}
                            </div>
                            {s.label}
                        </button>
                        {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
                    </div>
                ))}
            </div>

            <Card className="border-border/50">
                <CardContent className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 max-w-xl">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Version Number *</Label>
                                <Input value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} placeholder="e.g., 24.04 LTS" className="bg-muted/50 border-border/50 h-11 text-base" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Release Notes / Changelog</Label>
                                <Textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} placeholder="What's new in this version..." rows={8} className="bg-muted/50 border-border/50 text-sm" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Files</Label>
                                <Button variant="outline" size="sm" onClick={addFile}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add File
                                </Button>
                            </div>

                            {files.length === 0 && (
                                <button onClick={addFile} className="w-full p-10 rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center gap-3 hover:border-foreground/30 transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Click to add a file</span>
                                </button>
                            )}

                            {files.map((pf, i) => (
                                <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        {pf.file ? (
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{pf.file.name}</p>
                                                    <p className="text-xs text-muted-foreground">{formatBytes(pf.file.size)}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Input type="file" className="bg-muted/50 border-border/50 flex-1 text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) updateFile(i, { file: f }); }} />
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeFile(i)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Select value={pf.platform} onValueChange={(v) => updateFile(i, { platform: v })}>
                                            <SelectTrigger className="bg-muted/50 border-border/50 h-9 text-sm flex-1"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="windows">Windows</SelectItem>
                                                <SelectItem value="linux">Linux</SelectItem>
                                                <SelectItem value="macos">macOS (Intel)</SelectItem>
                                                <SelectItem value="macos-arm">macOS (Apple Silicon)</SelectItem>
                                                <SelectItem value="cross-platform">Cross-platform</SelectItem>
                                                <SelectItem value="android">Android (APK)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Select value={pf.architecture} onValueChange={(v) => updateFile(i, { architecture: v })}>
                                            <SelectTrigger className="bg-muted/50 border-border/50 h-9 text-sm flex-1"><SelectValue /></SelectTrigger>
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

                            {/* Upload Progress */}
                            {uploadProgress && (
                                <div className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden">
                                    <div className="w-full bg-muted h-2">
                                        <div className="bg-foreground h-2 transition-all duration-300 ease-out" style={{ width: `${uploadProgress.percent}%` }} />
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                                                <span className="text-sm font-medium truncate">{uploadProgress.fileName}</span>
                                                {uploadProgress.totalFiles > 1 && <span className="text-xs text-muted-foreground">({uploadProgress.index}/{uploadProgress.totalFiles})</span>}
                                            </div>
                                            <span className="text-xl font-mono font-bold tabular-nums">{uploadProgress.percent}%</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                                            <span>{formatBytes(uploadProgress.loaded)} / {formatBytes(uploadProgress.total)}</span>
                                            <span>{formatSpeed(uploadProgress.speed)} · {formatTime(uploadProgress.remaining)} left</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                        <Button variant="outline" onClick={() => step === 1 ? router.push(`/admin/software/${softwareId}`) : setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {step === 1 ? "Cancel" : "Back"}
                        </Button>
                        {step === 1 ? (
                            <Button onClick={() => { if (!versionNumber.trim()) { toast.error("Version number is required"); return; } setStep(2); }}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                {saving ? "Uploading..." : "Create Version"}
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
