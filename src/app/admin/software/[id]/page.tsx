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
    Scale, Star, ExternalLink,
} from "lucide-react";
import type { SoftwareItem } from "@/types";

function formatBytes(bytes: number) {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
    const [versionPlatform, setVersionPlatform] = useState("cross-platform");
    const [versionArch, setVersionArch] = useState("x86_64");
    const [dialogOpen, setDialogOpen] = useState(false);

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

    async function handleAddVersion(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!software) return;
        setUploading(true);
        const formData = new FormData(e.currentTarget);
        const file = formData.get("file") as File;
        if (!file || file.size === 0) { toast.error("Please select a file"); setUploading(false); return; }
        try {
            const presignRes = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream" }),
            });
            if (!presignRes.ok) { toast.error("Failed to prepare upload"); return; }
            const { uploadUrl, key, fileName } = await presignRes.json();
            const uploadRes = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": file.type || "application/octet-stream" },
                body: file,
            });
            if (!uploadRes.ok) { toast.error("File upload to storage failed"); return; }
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const checksum = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
            const res = await fetch(`/api/software/${software._id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionNumber: formData.get("versionNumber"),
                    releaseNotes: formData.get("releaseNotes"),
                    fileKey: key, fileName, fileSize: file.size, checksum,
                    platform: versionPlatform, architecture: versionArch,
                }),
            });
            if (res.ok) {
                const verData = await res.json();
                setSoftware({ ...software, versions: [...software.versions, verData.version] });
                toast.success("Version added");
                setDialogOpen(false);
            } else {
                toast.error("Failed to add version");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setUploading(false);
        }
    }

    async function handleDeleteVersion(versionId: string) {
        if (!software) return;
        if (!confirm("Delete this version? The file will be removed from storage.")) return;
        try {
            const res = await fetch(`/api/software/${software._id}/versions?versionId=${versionId}`, { method: "DELETE" });
            if (res.ok) {
                setSoftware({ ...software, versions: software.versions.filter((v) => v._id !== versionId) });
                toast.success("Version deleted");
            } else { toast.error("Delete failed"); }
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
                            </DialogHeader>
                            <form onSubmit={handleAddVersion} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Version Number *</Label>
                                    <Input name="versionNumber" placeholder="e.g., 24.04 LTS" required className="bg-muted/50 border-border/50" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Platform</Label>
                                        <Select value={versionPlatform} onValueChange={setVersionPlatform}>
                                            <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="windows">Windows</SelectItem>
                                                <SelectItem value="linux">Linux</SelectItem>
                                                <SelectItem value="macos">macOS</SelectItem>
                                                <SelectItem value="cross-platform">Cross-platform</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Architecture</Label>
                                        <Select value={versionArch} onValueChange={setVersionArch}>
                                            <SelectTrigger className="bg-muted/50 border-border/50"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="x86_64">x86_64</SelectItem>
                                                <SelectItem value="arm64">ARM64</SelectItem>
                                                <SelectItem value="universal">Universal</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Release Notes</Label>
                                    <Textarea name="releaseNotes" placeholder="What's new..." rows={3} className="bg-muted/50 border-border/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>File *</Label>
                                    <Input name="file" type="file" required className="bg-muted/50 border-border/50" />
                                </div>
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
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="w-[60px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...software.versions].reverse().map((v) => (
                                    <TableRow key={v._id}>
                                        <TableCell className="font-medium font-mono">v{v.versionNumber}</TableCell>
                                        <TableCell className="capitalize">{v.platform}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                <HardDrive className="h-3 w-3" />
                                                {formatBytes(v.fileSize)}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {new Date(v.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteVersion(v._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="border-border/50 bg-background max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Software</DialogTitle>
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
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" name="website" defaultValue={software.website} className="bg-muted/50 border-border/50" />
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
