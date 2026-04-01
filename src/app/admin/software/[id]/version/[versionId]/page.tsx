"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    ArrowLeft,
    ArrowRight,
    Plus,
    Trash2,
    Upload,
    Loader2,
    FileArchive,
    Save,
    AlertTriangle,
    Check,
    HardDrive,
} from "lucide-react";
import type { SoftwareItem, VersionFile } from "@/types";

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

export default function EditVersionPage() {
    const params = useParams();
    const router = useRouter();
    const softwareId = params.id as string;
    const versionId = params.versionId as string;

    const [software, setSoftware] = useState<SoftwareItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Step 1
    const [versionNumber, setVersionNumber] = useState("");
    const [releaseNotes, setReleaseNotes] = useState("");

    // Step 2
    const [existingFiles, setExistingFiles] = useState<VersionFile[]>([]);
    const [newFiles, setNewFiles] = useState<PendingFile[]>([]);
    const [removeFileIds, setRemoveFileIds] = useState<string[]>([]);

    // Delete file confirmation
    const [deleteFileTarget, setDeleteFileTarget] = useState<VersionFile | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    // Upload progress
    const [uploadProgress, setUploadProgress] = useState<{
        percent: number; loaded: number; total: number; speed: number;
        remaining: number; fileName: string; index: number; totalFiles: number;
    } | null>(null);

    useEffect(() => {
        fetch(`/api/software/${softwareId}`)
            .then((r) => r.json())
            .then((data) => {
                const sw = data.software;
                setSoftware(sw);
                const v = sw?.versions?.find((ver: { _id: string }) => ver._id === versionId);
                if (v) {
                    setVersionNumber(v.versionNumber || "");
                    setReleaseNotes(v.releaseNotes || "");
                    setExistingFiles(v.files && v.files.length > 0 ? v.files : []);
                }
            })
            .finally(() => setLoading(false));
    }, [softwareId, versionId]);

    function confirmDeleteFile() {
        if (!deleteFileTarget || !software) return;
        setRemoveFileIds([...removeFileIds, deleteFileTarget._id]);
        setDeleteFileTarget(null);
        setDeletePassword("");
        setDeleteConfirmText("");
        toast.success("File marked for removal — save to apply");
    }

    async function handleSave() {
        setSaving(true);
        try {
            // Upload new files
            const uploaded = [];
            const validNew = newFiles.filter((f) => f.file && f.file.size > 0);

            for (let i = 0; i < validNew.length; i++) {
                const pf = validNew[i];
                const file = pf.file!;

                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }),
                });
                if (!presignRes.ok) { toast.error(`Failed to prepare ${file.name}`); setSaving(false); return; }
                const { uploadUrl, key } = await presignRes.json();

                setUploadProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, remaining: 0, fileName: file.name, index: i + 1, totalFiles: validNew.length });
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
                        setUploadProgress({ percent: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed: smooth, remaining: smooth > 0 ? (e.total - e.loaded) / smooth : 0, fileName: file.name, index: i + 1, totalFiles: validNew.length });
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
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionId,
                    versionNumber,
                    releaseNotes,
                    removeFileIds: removeFileIds.length > 0 ? removeFileIds : undefined,
                    files: uploaded.length > 0 ? uploaded : undefined,
                    password: removeFileIds.length > 0 ? deletePassword : undefined,
                    confirmText: removeFileIds.length > 0 ? `delete ${software?.name} file` : undefined,
                }),
            });

            if (res.ok) {
                toast.success("Version updated!");
                router.push(`/admin/software/${softwareId}`);
            } else {
                const data = await res.json();
                toast.error(data.error || "Update failed");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    // For save, we need password if files are being removed
    const [savePassword, setSavePassword] = useState("");
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);

    function handleSaveClick() {
        if (removeFileIds.length > 0) {
            setShowSaveConfirm(true);
            setSavePassword("");
        } else {
            handleSaveDirectly();
        }
    }

    async function handleSaveDirectly() {
        setSaving(true);
        try {
            const uploaded = [];
            const validNew = newFiles.filter((f) => f.file && f.file.size > 0);

            for (let i = 0; i < validNew.length; i++) {
                const pf = validNew[i];
                const file = pf.file!;

                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }),
                });
                if (!presignRes.ok) { toast.error(`Failed to prepare ${file.name}`); setSaving(false); return; }
                const { uploadUrl, key } = await presignRes.json();

                setUploadProgress({ percent: 0, loaded: 0, total: file.size, speed: 0, remaining: 0, fileName: file.name, index: i + 1, totalFiles: validNew.length });
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
                        setUploadProgress({ percent: Math.round((e.loaded / e.total) * 100), loaded: e.loaded, total: e.total, speed: smooth, remaining: smooth > 0 ? (e.total - e.loaded) / smooth : 0, fileName: file.name, index: i + 1, totalFiles: validNew.length });
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
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionId,
                    versionNumber,
                    releaseNotes,
                    removeFileIds: removeFileIds.length > 0 ? removeFileIds : undefined,
                    files: uploaded.length > 0 ? uploaded : undefined,
                    password: removeFileIds.length > 0 ? savePassword : undefined,
                    confirmText: removeFileIds.length > 0 ? `delete ${software?.name} file` : undefined,
                }),
            });

            if (res.ok) {
                toast.success("Version updated!");
                router.push(`/admin/software/${softwareId}`);
            } else {
                const data = await res.json();
                toast.error(data.error || "Update failed");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
            setShowSaveConfirm(false);
        }
    }

    const steps = [
        { num: 1, label: "Version Info" },
        { num: 2, label: "Files" },
    ];

    if (loading) {
        return <div className="p-6 max-w-4xl space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-64" /></div>;
    }

    const activeExisting = existingFiles.filter((f) => !removeFileIds.includes(f._id));

    return (
        <div className="p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/admin/software/${softwareId}`)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">Edit Version — v{versionNumber}</h1>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-3 mb-8">
                {steps.map((s, i) => (
                    <div key={s.num} className="flex items-center gap-3">
                        <button
                            onClick={() => setStep(s.num)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                step === s.num ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                step === s.num ? "bg-foreground/20 text-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                                {s.num}
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
                                <Label className="text-sm font-medium">Version Number</Label>
                                <Input value={versionNumber} onChange={(e) => setVersionNumber(e.target.value)} className="bg-muted/50 border-border/50 h-11 text-base" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Release Notes / Changelog</Label>
                                <Textarea value={releaseNotes} onChange={(e) => setReleaseNotes(e.target.value)} placeholder="What's new..." rows={8} className="bg-muted/50 border-border/50 text-sm" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Existing files */}
                            <Label className="text-sm font-medium">Current Files ({activeExisting.length})</Label>
                            {activeExisting.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic py-2">No files remaining</p>
                            ) : (
                                <div className="space-y-2">
                                    {activeExisting.map((f) => (
                                        <div key={f._id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                                            <FileArchive className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{f.fileName}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] capitalize">{f.platform}</Badge>
                                                    <Badge variant="secondary" className="text-[10px]">{f.architecture}</Badge>
                                                    <span className="text-xs text-muted-foreground">{formatBytes(f.fileSize)}</span>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                                                onClick={() => { setDeleteFileTarget(f); setDeletePassword(""); setDeleteConfirmText(""); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {removeFileIds.length > 0 && (
                                <p className="text-xs text-destructive">{removeFileIds.length} file{removeFileIds.length > 1 ? "s" : ""} marked for deletion — will be removed on save</p>
                            )}

                            {/* Add new files */}
                            <div className="flex items-center justify-between pt-4">
                                <Label className="text-sm font-medium">Add New Files</Label>
                                <Button variant="outline" size="sm" onClick={() => setNewFiles([...newFiles, { file: null, platform: "cross-platform", architecture: "x86_64" }])}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add File
                                </Button>
                            </div>
                            {newFiles.map((pf, i) => (
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
                                            <Input type="file" className="bg-muted/50 border-border/50 flex-1 text-sm" onChange={(e) => { const f = e.target.files?.[0]; if (f) setNewFiles(newFiles.map((nf, j) => j === i ? { ...nf, file: f } : nf)); }} />
                                        )}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Select value={pf.platform} onValueChange={(v) => setNewFiles(newFiles.map((nf, j) => j === i ? { ...nf, platform: v } : nf))}>
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
                                        <Select value={pf.architecture} onValueChange={(v) => setNewFiles(newFiles.map((nf, j) => j === i ? { ...nf, architecture: v } : nf))}>
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
                            <Button onClick={() => setStep(2)}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={handleSaveClick} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Delete File Confirmation */}
            <Dialog open={!!deleteFileTarget} onOpenChange={(open) => { if (!open) setDeleteFileTarget(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    {deleteFileTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Remove File
                                </DialogTitle>
                                <DialogDescription>
                                    This file will be deleted from storage when you save. This cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                <p className="font-medium truncate">{deleteFileTarget.fileName}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                    <span className="capitalize">{deleteFileTarget.platform}</span>
                                    <span>{deleteFileTarget.architecture}</span>
                                    <span>{formatBytes(deleteFileTarget.fileSize)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDeleteFileTarget(null)}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" onClick={confirmDeleteFile}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Save with file deletions — password required */}
            <Dialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Confirm File Deletion
                        </DialogTitle>
                        <DialogDescription>
                            {removeFileIds.length} file{removeFileIds.length > 1 ? "s" : ""} will be permanently deleted from storage. Enter your admin password to confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Admin Password</Label>
                            <Input type="password" value={savePassword} onChange={(e) => setSavePassword(e.target.value)} placeholder="Enter your password" className="bg-muted/50 border-border/50" />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Confirmation text: <code className="text-destructive bg-muted px-1.5 py-0.5 rounded">delete {software?.name} file</code>
                        </p>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowSaveConfirm(false)} disabled={saving}>Cancel</Button>
                        <Button variant="destructive" className="flex-1" onClick={handleSaveDirectly} disabled={saving || !savePassword}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save & Delete Files
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
