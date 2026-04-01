"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Loader2, Save, Plus, Trash2, Upload, HardDrive, ImagePlus,
    Package, ArrowLeft, Pencil, Download, Eye, Calendar, Globe,
    Scale, Star, ExternalLink, CheckCircle2, AlertTriangle,
    ArrowUp, Clock,
} from "lucide-react";
import type { SoftwareItem } from "@/types";

function formatBytes(bytes: number) {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
    return (
        <Card className="border-border/50">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-lg font-semibold tabular-nums">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SoftwareDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [software, setSoftware] = useState<SoftwareItem | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit mode state
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editCategory, setEditCategory] = useState("other");

    // Version dialog state
    const [uploading, setUploading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Upload progress state
    interface UploadProgress {
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
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

    // Multi-file upload state
    interface PendingFile {
        file: File;
        platform: string;
        architecture: string;
    }
    const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

    // Delete version dialog state
    const [deleteVersionId, setDeleteVersionId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Logo upload state
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [dragging, setDragging] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetch(`/api/software/${params.id}`)
            .then((r) => r.json())
            .then((data) => {
                setSoftware(data.software);
                setEditCategory(data.software?.category || "other");
            })
            .finally(() => setLoading(false));
    }, [params.id]);

    // --- Handlers ---

    async function onSave(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!software) return;
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        try {
            const res = await fetch(`/api/software/${software._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    description: formData.get("description"),
                    category: editCategory,
                    website: formData.get("website"),
                    githubUrl: formData.get("githubUrl"),
                    license: formData.get("license"),
                    isFeatured: formData.get("isFeatured") === "on",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setSoftware(data.software);
                setEditing(false);
                toast.success("Software updated");
            } else {
                toast.error("Update failed");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    function handleLogoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) uploadLogo(file);
    }

    function handleLogoDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith("image/")) {
            uploadLogo(file);
        } else {
            toast.error("Please drop an image file");
        }
    }

    async function uploadLogo(file: File) {
        if (!file || !software) return;
        setUploadingLogo(true);
        try {
            const uploadData = new FormData();
            uploadData.append("file", file);
            const uploadRes = await fetch("/api/upload/image", { method: "POST", body: uploadData });
            if (!uploadRes.ok) { toast.error("Logo upload failed"); return; }
            const { key } = await uploadRes.json();
            const res = await fetch(`/api/software/${software._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ iconKey: key }),
            });
            if (res.ok) {
                const data = await res.json();
                setSoftware(data.software);
                toast.success("Logo updated");
            } else {
                toast.error("Failed to save logo");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setUploadingLogo(false);
            if (logoInputRef.current) logoInputRef.current.value = "";
        }
    }

    function addFileEntry() {
        setPendingFiles([...pendingFiles, { file: null as unknown as File, platform: "cross-platform", architecture: "x86_64" }]);
    }

    function updateFileEntry(index: number, updates: Partial<PendingFile>) {
        setPendingFiles(pendingFiles.map((f, i) => i === index ? { ...f, ...updates } : f));
    }

    function removeFileEntry(index: number) {
        setPendingFiles(pendingFiles.filter((_, i) => i !== index));
    }

    async function handleAddVersion(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!software) return;
        const validFiles = pendingFiles.filter((pf) => pf.file && pf.file.size > 0);
        if (validFiles.length === 0) { toast.error("Please add at least one file"); return; }
        setUploading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const uploadedFiles = [];

            for (let i = 0; i < validFiles.length; i++) {
                const pf = validFiles[i];
                // Get presigned URL
                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: pf.file.name, contentType: pf.file.type || "application/octet-stream" }),
                });
                if (!presignRes.ok) { toast.error(`Failed to prepare upload for ${pf.file.name}`); setUploadProgress(null); return; }
                const { uploadUrl, key } = await presignRes.json();

                // Upload to S3 with progress
                setUploadProgress({ percent: 0, loaded: 0, total: pf.file.size, speed: 0, elapsed: 0, remaining: 0, currentFileName: pf.file.name, currentIndex: i + 1, totalFiles: validFiles.length });
                const uploadOk = await new Promise<boolean>((resolve) => {
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
                        setUploadProgress({
                            percent: Math.round((e.loaded / e.total) * 100),
                            loaded: e.loaded,
                            total: e.total,
                            speed: smoothSpeed,
                            elapsed: elapsedMs / 1000,
                            remaining: smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0,
                            currentFileName: pf.file.name,
                            currentIndex: i + 1,
                            totalFiles: validFiles.length,
                        });
                    });
                    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.addEventListener("abort", () => resolve(false));
                    xhr.open("PUT", uploadUrl);
                    xhr.setRequestHeader("Content-Type", pf.file.type || "application/octet-stream");
                    xhr.send(pf.file);
                });
                if (!uploadOk) { toast.error(`Upload failed for ${pf.file.name}`); setUploadProgress(null); return; }

                uploadedFiles.push({
                    fileKey: key,
                    fileName: pf.file.name,
                    fileSize: pf.file.size,
                    platform: pf.platform,
                    architecture: pf.architecture,
                });
            }
            setUploadProgress(null);

            const res = await fetch(`/api/software/${software._id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionNumber: formData.get("versionNumber"),
                    releaseNotes: formData.get("releaseNotes"),
                    files: uploadedFiles,
                }),
            });
            if (res.ok) {
                const verData = await res.json();
                setSoftware({ ...software, versions: [...software.versions, verData.version] });
                toast.success("Version added");
                setDialogOpen(false);
                setPendingFiles([]);
            } else {
                toast.error("Failed to add version");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setUploading(false);
        }
    }

    async function handleDeleteVersion() {
        if (!software || !deleteVersionId) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/software/${software._id}/versions?versionId=${deleteVersionId}`, { method: "DELETE" });
            if (res.ok) {
                setSoftware({
                    ...software,
                    versions: software.versions.map((v) =>
                        v._id === deleteVersionId ? { ...v, isDeleted: true } : v
                    ),
                    defaultVersionId: software.defaultVersionId === deleteVersionId ? "" : software.defaultVersionId,
                });
                toast.success("Version deleted");
            } else { toast.error("Delete failed"); }
        } catch { toast.error("Something went wrong"); }
        finally {
            setDeleting(false);
            setDeleteVersionId(null);
        }
    }

    async function handleSetDefault(versionId: string) {
        if (!software) return;
        try {
            const res = await fetch(`/api/software/${software._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ defaultVersionId: versionId }),
            });
            if (res.ok) {
                const data = await res.json();
                setSoftware(data.software);
                toast.success("Default version updated");
            } else { toast.error("Failed to set default version"); }
        } catch { toast.error("Something went wrong"); }
    }

    // --- Render ---

    if (loading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <div className="grid grid-cols-3 gap-3">
                    <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
                </div>
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!software) {
        return <div className="p-6">Software not found</div>;
    }

    return (
        <div className="p-6 space-y-6">
            {/* Back + Title Row */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/admin/software")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        {software.iconKey ? (
                            <Image
                                src={`/api/assets/${software.iconKey}`}
                                alt={software.name}
                                width={40} height={40}
                                className="h-10 w-10 rounded-lg object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{software.name}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                    {software.category.replace("-", " ")}
                                </Badge>
                                {software.isFeatured && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                        <Star className="h-2.5 w-2.5 mr-1" /> Featured
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => { setEditing(true); setEditCategory(software.category); }}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Download} label="Total Downloads" value={software.totalDownloads.toLocaleString()} />
                <StatCard icon={Package} label="Versions" value={software.versions.length} />
                <StatCard icon={Eye} label="Page Views" value="—" />
                <StatCard icon={Calendar} label="Added" value={new Date(software.createdAt).toLocaleDateString()} />
            </div>

            {/* Software Info */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">About</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {software.description ? (
                        <p className="text-sm text-muted-foreground leading-relaxed">{software.description}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground/50 italic">No description provided</p>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                        {software.license && (
                            <div className="flex items-center gap-2 text-sm">
                                <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-muted-foreground">License:</span>
                                <span className="font-medium">{software.license}</span>
                            </div>
                        )}
                        {software.website && (
                            <div className="flex items-center gap-2 text-sm">
                                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                <a href={software.website} target="_blank" rel="noopener noreferrer"
                                    className="text-foreground hover:underline truncate flex items-center gap-1">
                                    Website <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Updated:</span>
                            <span className="font-medium">{new Date(software.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Versions */}
            <Card className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base">Versions ({software.versions.length})</CardTitle>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="mr-2 h-3.5 w-3.5" />
                                Add Version
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-border/50 bg-background">
                            <DialogHeader>
                                <DialogTitle>Upload New Version</DialogTitle>
                                <DialogDescription>Add a new version with its release file.</DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddVersion} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Version Number *</Label>
                                    <Input name="versionNumber" placeholder="e.g., 24.04 LTS" required className="bg-muted/50 border-border/50" />
                                </div>

                                {/* Multi-file entries */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Files *</Label>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={addFileEntry}>
                                            <Plus className="h-3 w-3 mr-1" /> Add File
                                        </Button>
                                    </div>
                                    {pendingFiles.length === 0 && (
                                        <button type="button" onClick={addFileEntry} className="w-full p-4 rounded-lg border-2 border-dashed border-border/50 text-sm text-muted-foreground hover:border-foreground/30 transition-colors">
                                            Click to add a file
                                        </button>
                                    )}
                                    {pendingFiles.map((pf, i) => (
                                        <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="file"
                                                    className="bg-muted/50 border-border/50 flex-1 text-xs"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) updateFileEntry(i, { file });
                                                    }}
                                                />
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0" onClick={() => removeFileEntry(i)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Select value={pf.platform} onValueChange={(v) => updateFileEntry(i, { platform: v })}>
                                                    <SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="windows">Windows</SelectItem>
                                                        <SelectItem value="linux">Linux</SelectItem>
                                                        <SelectItem value="macos">macOS (Intel)</SelectItem>
                                                        <SelectItem value="macos-arm">macOS (Apple Silicon)</SelectItem>
                                                        <SelectItem value="cross-platform">Cross-platform</SelectItem>
                                                        <SelectItem value="android">Android (APK)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Select value={pf.architecture} onValueChange={(v) => updateFileEntry(i, { architecture: v })}>
                                                    <SelectTrigger className="bg-muted/50 border-border/50 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="x86_64">x86_64</SelectItem>
                                                        <SelectItem value="arm64">ARM64</SelectItem>
                                                        <SelectItem value="universal">Universal</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {pf.file && (
                                                <p className="text-[11px] text-muted-foreground truncate">
                                                    {pf.file.name} ({(pf.file.size / (1024 * 1024)).toFixed(2)} MB)
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    <Label>Release Notes</Label>
                                    <Textarea name="releaseNotes" placeholder="What's new..." rows={3} className="bg-muted/50 border-border/50" />
                                </div>
                                {/* Upload Progress */}
                                {uploadProgress && (
                                    <div className="rounded-lg border border-border/50 bg-muted/50 overflow-hidden">
                                        <div className="w-full bg-muted h-2">
                                            <div className="bg-foreground h-2 transition-all duration-300 ease-out" style={{ width: `${uploadProgress.percent}%` }} />
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin flex-shrink-0" />
                                                    <span className="text-xs font-medium truncate">
                                                        {uploadProgress.currentFileName}
                                                        {uploadProgress.totalFiles > 1 && (
                                                            <span className="text-muted-foreground"> ({uploadProgress.currentIndex}/{uploadProgress.totalFiles})</span>
                                                        )}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-mono font-medium tabular-nums ml-2">{uploadProgress.percent}%</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 border border-border/30">
                                                    <ArrowUp className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-mono tabular-nums">{formatSpeed(uploadProgress.speed)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 border border-border/30">
                                                    <HardDrive className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-mono tabular-nums">{formatBytes(uploadProgress.loaded)}/{formatBytes(uploadProgress.total)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 border border-border/30">
                                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-[10px] font-mono tabular-nums">{formatTime(uploadProgress.remaining)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" disabled={uploading} className="w-full">
                                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                    {uploading ? "Uploading..." : "Upload Version"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    {software.versions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No versions yet. Click &quot;Add Version&quot; to upload.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Version</TableHead>
                                    <TableHead>Files</TableHead>
                                    <TableHead>Platforms</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-[120px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...software.versions]
                                    .reverse()
                                    .sort((a, b) => {
                                        // Default version first
                                        if (a._id === software.defaultVersionId) return -1;
                                        if (b._id === software.defaultVersionId) return 1;
                                        // Deleted versions last
                                        if (a.isDeleted && !b.isDeleted) return 1;
                                        if (!a.isDeleted && b.isDeleted) return -1;
                                        return 0;
                                    })
                                    .map((v) => (
                                    <TableRow key={v._id} className={v.isDeleted ? "opacity-50" : ""}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium font-mono">v{v.versionNumber}</span>
                                                {v._id === software.defaultVersionId && !v.isDeleted && (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        Default
                                                    </Badge>
                                                )}
                                                {v.isDeleted && (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-destructive border-destructive/30">
                                                        Deleted
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm tabular-nums">
                                            {v.files && v.files.length > 0 ? `${v.files.length} file${v.files.length > 1 ? "s" : ""}` : v.fileKey ? "1 file" : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {v.files && v.files.length > 0
                                                    ? [...new Set(v.files.map((f: { platform: string }) => f.platform))].map((p) => (
                                                        <Badge key={p} variant="secondary" className="text-[10px] capitalize px-1.5 py-0">{p}</Badge>
                                                    ))
                                                    : v.platform && <Badge variant="secondary" className="text-[10px] capitalize px-1.5 py-0">{v.platform}</Badge>
                                                }
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(v.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {!v.isDeleted && (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-8 w-8 ${v._id === software.defaultVersionId ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
                                                        onClick={() => handleSetDefault(v._id)}
                                                        title={v._id === software.defaultVersionId ? "Default version" : "Set as default"}
                                                    >
                                                        <Star className={`h-4 w-4 ${v._id === software.defaultVersionId ? "fill-yellow-500" : ""}`} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => setDeleteVersionId(v._id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Delete Version Confirmation Dialog */}
            <Dialog open={!!deleteVersionId} onOpenChange={(open) => { if (!open) setDeleteVersionId(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Version
                        </DialogTitle>
                        <DialogDescription>
                            This will permanently delete the file from storage. The version entry will remain visible but marked as deleted.
                        </DialogDescription>
                    </DialogHeader>
                    {deleteVersionId && (
                        <p className="text-sm text-muted-foreground">
                            Version: <span className="font-mono font-medium text-foreground">
                                v{software.versions.find((v) => v._id === deleteVersionId)?.versionNumber}
                            </span>
                        </p>
                    )}
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteVersionId(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={handleDeleteVersion} disabled={deleting}>
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="border-border/50 bg-background max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Software</DialogTitle>
                        <DialogDescription>Update software details and metadata.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSave} className="space-y-4">
                        {/* Logo Upload */}
                        <div className="space-y-2">
                            <Label>Logo</Label>
                            <input
                                ref={logoInputRef} type="file"
                                accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                                onChange={handleLogoInputChange} className="hidden"
                            />
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={handleLogoDrop}
                                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                                className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 transition-colors text-center ${dragging
                                        ? "border-foreground/40 bg-foreground/[0.04]"
                                        : "border-border/50 hover:border-foreground/20 hover:bg-muted/30"
                                    }`}
                            >
                                {uploadingLogo ? (
                                    <div className="flex items-center justify-center gap-2 py-1">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <p className="text-xs text-muted-foreground">Uploading…</p>
                                    </div>
                                ) : software.iconKey ? (
                                    <div className="flex items-center gap-3">
                                        <Image src={`/api/assets/${software.iconKey}`} alt={software.name}
                                            width={48} height={48}
                                            className="h-12 w-12 rounded-lg object-cover border border-border/50"
                                            unoptimized />
                                        <div className="text-left">
                                            <p className="text-xs font-medium">Drop to replace</p>
                                            <p className="text-[11px] text-muted-foreground">or click to browse</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 py-1">
                                        <ImagePlus className="h-4 w-4 text-muted-foreground/50" />
                                        <p className="text-xs text-muted-foreground">Drop logo here or click to browse</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={software.name} required className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" name="description" defaultValue={software.description} rows={3} className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={editCategory} onValueChange={setEditCategory}>
                                    <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="operating-system">Operating System</SelectItem>
                                        <SelectItem value="development">Development</SelectItem>
                                        <SelectItem value="productivity">Productivity</SelectItem>
                                        <SelectItem value="utility">Utility</SelectItem>
                                        <SelectItem value="multimedia">Multimedia</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license">License</Label>
                                <Input id="license" name="license" defaultValue={software.license} className="bg-muted/50 border-border/50" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input id="website" name="website" defaultValue={software.website} className="bg-muted/50 border-border/50" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="githubUrl">GitHub URL</Label>
                                <Input id="githubUrl" name="githubUrl" defaultValue={software.githubUrl} placeholder="https://github.com/..." className="bg-muted/50 border-border/50" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isFeatured" name="isFeatured" defaultChecked={software.isFeatured} className="rounded" />
                            <Label htmlFor="isFeatured" className="cursor-pointer">Feature on homepage</Label>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={saving} className="flex-1">
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
