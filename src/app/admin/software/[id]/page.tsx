"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Upload, HardDrive } from "lucide-react";
import type { SoftwareItem } from "@/types";

function formatBytes(bytes: number) {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function EditSoftwarePage() {
    const params = useParams();
    const [software, setSoftware] = useState<SoftwareItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [category, setCategory] = useState("other");

    // Version upload state
    const [addingVersion, setAddingVersion] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [versionPlatform, setVersionPlatform] = useState("cross-platform");
    const [versionArch, setVersionArch] = useState("x86_64");
    const [dialogOpen, setDialogOpen] = useState(false);

    useEffect(() => {
        fetch(`/api/software/${params.id}`)
            .then((r) => r.json())
            .then((data) => {
                setSoftware(data.software);
                setCategory(data.software?.category || "other");
            })
            .finally(() => setLoading(false));
    }, [params.id]);

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
                    category,
                    website: formData.get("website"),
                    license: formData.get("license"),
                    isFeatured: formData.get("isFeatured") === "on",
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setSoftware(data.software);
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

    async function handleAddVersion(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!software) return;
        setUploading(true);

        const formData = new FormData(e.currentTarget);
        const file = formData.get("file") as File;

        if (!file || file.size === 0) {
            toast.error("Please select a file");
            setUploading(false);
            return;
        }

        try {
            // Upload file to S3
            const uploadData = new FormData();
            uploadData.append("file", file);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: uploadData,
            });

            if (!uploadRes.ok) {
                toast.error("File upload failed");
                return;
            }

            const fileData = await uploadRes.json();

            // Add version to software
            const res = await fetch(`/api/software/${software._id}/versions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    versionNumber: formData.get("versionNumber"),
                    releaseNotes: formData.get("releaseNotes"),
                    fileKey: fileData.key,
                    fileName: fileData.fileName,
                    fileSize: fileData.fileSize,
                    checksum: fileData.checksum,
                    platform: versionPlatform,
                    architecture: versionArch,
                }),
            });

            if (res.ok) {
                const verData = await res.json();
                setSoftware({
                    ...software,
                    versions: [...software.versions, verData.version],
                });
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
            const res = await fetch(
                `/api/software/${software._id}/versions?versionId=${versionId}`,
                { method: "DELETE" }
            );

            if (res.ok) {
                setSoftware({
                    ...software,
                    versions: software.versions.filter((v) => v._id !== versionId),
                });
                toast.success("Version deleted");
            } else {
                toast.error("Delete failed");
            }
        } catch {
            toast.error("Something went wrong");
        }
    }

    if (loading) {
        return (
            <div className="p-6 max-w-3xl space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!software) {
        return <div className="p-6">Software not found</div>;
    }

    return (
        <div className="p-6 max-w-3xl space-y-6">
            <h1 className="text-2xl font-bold">Edit: {software.name}</h1>

            {/* Edit form */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <CardTitle className="text-lg">Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                name="name"
                                defaultValue={software.name}
                                required
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={software.description}
                                rows={4}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-white/5 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
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
                                <Input
                                    id="license"
                                    name="license"
                                    defaultValue={software.license}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                name="website"
                                defaultValue={software.website}
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isFeatured"
                                name="isFeatured"
                                defaultChecked={software.isFeatured}
                                className="rounded"
                            />
                            <Label htmlFor="isFeatured" className="cursor-pointer">
                                Featured
                            </Label>
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Changes
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Versions */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Versions ({software.versions.length})</CardTitle>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Version
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="border-white/10 bg-background">
                            <DialogHeader>
                                <DialogTitle>Upload New Version</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddVersion} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Version Number *</Label>
                                    <Input name="versionNumber" placeholder="e.g., 24.04 LTS" required className="bg-white/5 border-white/10" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Platform</Label>
                                        <Select value={versionPlatform} onValueChange={setVersionPlatform}>
                                            <SelectTrigger className="bg-white/5 border-white/10">
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
                                    <div className="space-y-2">
                                        <Label>Architecture</Label>
                                        <Select value={versionArch} onValueChange={setVersionArch}>
                                            <SelectTrigger className="bg-white/5 border-white/10">
                                                <SelectValue />
                                            </SelectTrigger>
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
                                    <Textarea name="releaseNotes" placeholder="What's new..." rows={3} className="bg-white/5 border-white/10" />
                                </div>
                                <div className="space-y-2">
                                    <Label>File *</Label>
                                    <Input name="file" type="file" required className="bg-white/5 border-white/10" />
                                </div>
                                <Button type="submit" disabled={uploading} className="w-full">
                                    {uploading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="mr-2 h-4 w-4" />
                                    )}
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
                                <TableRow className="border-white/10">
                                    <TableHead>Version</TableHead>
                                    <TableHead>Platform</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[...software.versions].reverse().map((v) => (
                                    <TableRow key={v._id} className="border-white/10">
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
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteVersion(v._id)}
                                                className="text-red-400 hover:text-red-300"
                                            >
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
        </div>
    );
}
