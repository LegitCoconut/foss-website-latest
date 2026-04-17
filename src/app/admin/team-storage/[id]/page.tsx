"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    ChevronLeft,
    Save,
    Users,
    UserPlus,
    UserMinus,
    Search,
    Ban,
    CheckCircle,
    Trash2,
    Loader2,
    AlertTriangle,
    Files,
    Pencil,
    HardDrive,
    FolderArchive,
} from "lucide-react";
import type { TeamItem, TeamFileItem, TeamMember } from "@/types";
import { getPreviewKind, SYSTEM_MAX_FILE_SIZE } from "@/lib/team-storage-config";
import { TeamStats } from "@/components/team-storage/TeamStats";
import { FileTable } from "@/components/team-storage/FileTable";
import { UploadPanel } from "@/components/team-storage/UploadPanel";
import { FileViewerModal } from "@/components/team-storage/FileViewerModal";
import { TextEditor } from "@/components/team-storage/TextEditor";
import { ShareDialog } from "@/components/team-storage/ShareDialog";
import { formatBytes } from "@/components/team-storage/utils";

interface SearchUser {
    _id: string;
    name: string;
    email: string;
}

export default function AdminTeamDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [team, setTeam] = useState<TeamItem | null>(null);
    const [files, setFiles] = useState<TeamFileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Inline edit state
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editStorageLimitGB, setEditStorageLimitGB] = useState("");
    const [editMaxFileSizeMB, setEditMaxFileSizeMB] = useState("");
    const [useSystemDefault, setUseSystemDefault] = useState(false);

    // Member management
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<SearchUser[]>([]);
    const [searchingMembers, setSearchingMembers] = useState(false);

    // File viewer + editor
    const [viewerIndex, setViewerIndex] = useState<number | null>(null);
    const [editorState, setEditorState] = useState<{
        mode: "create" | "edit";
        fileId?: string;
        fileName?: string;
        initialContent?: string;
    } | null>(null);

    // Delete file dialog
    const [deleteFileTarget, setDeleteFileTarget] = useState<TeamFileItem | null>(null);
    const [deletingFile, setDeletingFile] = useState(false);

    // Share file
    const [shareFile, setShareFile] = useState<TeamFileItem | null>(null);

    // Status toggle / delete team
    const [statusDialog, setStatusDialog] = useState<"suspend" | "activate" | null>(null);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirmText, setDeleteConfirmText] = useState("");
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        fetchTeamData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    async function fetchTeamData() {
        try {
            const res = await fetch(`/api/team-storage/${id}`);
            if (!res.ok) {
                toast.error("Failed to load team");
                return;
            }
            const data = await res.json();
            setTeam(data.team);
            setFiles(data.files || []);
            // Hydrate edit fields
            setEditName(data.team.name);
            setEditDescription(data.team.description || "");
            setEditStorageLimitGB(String(data.team.storageLimit / (1024 * 1024 * 1024)));
            if (data.team.maxFileSize) {
                setEditMaxFileSizeMB(String(Math.round(data.team.maxFileSize / (1024 * 1024))));
                setUseSystemDefault(false);
            } else {
                setEditMaxFileSizeMB("");
                setUseSystemDefault(true);
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const storageLimit = parseFloat(editStorageLimitGB) * 1024 * 1024 * 1024;
            const maxFileSize = useSystemDefault
                ? null
                : parseFloat(editMaxFileSizeMB) * 1024 * 1024;

            const res = await fetch(`/api/admin/team-storage/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDescription.trim(),
                    storageLimit,
                    maxFileSize,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save");
                return;
            }
            toast.success("Team updated");
            setEditing(false);
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    async function searchUsers() {
        if (!memberSearch.trim()) return;
        setSearchingMembers(true);
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(memberSearch)}`);
            const data = await res.json();
            setMemberResults(data.users || []);
        } catch {
            toast.error("Search failed");
        } finally {
            setSearchingMembers(false);
        }
    }

    async function addMember(userId: string) {
        try {
            const res = await fetch(`/api/admin/team-storage/${id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }
            toast.success("Member added");
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        }
    }

    async function removeMember(userId: string) {
        try {
            const res = await fetch(`/api/admin/team-storage/${id}/members`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }
            toast.success("Member removed");
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        }
    }

    async function handleDownload(file: TeamFileItem) {
        try {
            const res = await fetch(`/api/team-storage/${id}/files/${file._id}/download`);
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Download failed");
                return;
            }
            const a = document.createElement("a");
            a.href = data.url;
            a.download = data.fileName;
            a.click();
        } catch {
            toast.error("Download failed");
        }
    }

    async function handleDeleteFile() {
        if (!deleteFileTarget) return;
        setDeletingFile(true);
        try {
            const res = await fetch(`/api/team-storage/${id}/files`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileId: deleteFileTarget._id }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Delete failed");
                return;
            }
            toast.success("File deleted");
            setDeleteFileTarget(null);
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setDeletingFile(false);
        }
    }

    async function handleToggleStatus() {
        if (!team || !statusDialog) return;
        const newStatus = statusDialog === "suspend" ? "suspended" : "active";
        setTogglingStatus(true);
        try {
            const res = await fetch(`/api/admin/team-storage/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error);
                return;
            }
            toast.success(`Team ${newStatus === "suspended" ? "suspended" : "activated"}`);
            setStatusDialog(null);
            fetchTeamData();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setTogglingStatus(false);
        }
    }

    async function handleDeleteTeam() {
        if (!team) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/team-storage/${id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: deletePassword, confirmText: deleteConfirmText }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Delete failed");
                return;
            }
            toast.success("Team deleted");
            router.push("/admin/team-storage");
        } catch {
            toast.error("Something went wrong");
        } finally {
            setDeleting(false);
        }
    }

    const previewableFiles = files.filter((f) => getPreviewKind(f.contentType, f.fileName) !== null);

    function handlePreview(file: TeamFileItem) {
        const idx = previewableFiles.findIndex((f) => f._id === file._id);
        if (idx !== -1) setViewerIndex(idx);
    }

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-28" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    if (!team) {
        return (
            <div className="p-6">
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <FolderArchive className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">Team not found</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const confirmTextRequired = `delete ${team.name}`;
    const confirmTextMatches = deleteConfirmText.trim().toLowerCase() === confirmTextRequired.toLowerCase();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-1" asChild>
                    <Link href="/admin/team-storage">
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight">{team.name}</h1>
                        <Badge className={team.status === "suspended" ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-green-500/10 text-green-400 border-green-500/20"}>
                            {team.status === "suspended" && <Ban className="h-3 w-3 mr-1" />}
                            {team.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                            {team.status}
                        </Badge>
                    </div>
                    {team.description && !editing && (
                        <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!editing && (
                        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                        </Button>
                    )}
                    {team.status === "active" ? (
                        <Button variant="outline" size="sm" onClick={() => setStatusDialog("suspend")}>
                            <Ban className="h-3.5 w-3.5 mr-1.5" />
                            Suspend
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setStatusDialog("activate")}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Activate
                        </Button>
                    )}
                </div>
            </div>

            {/* Edit form (inline) */}
            {editing && (
                <Card className="border-border/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Edit Team Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Storage Limit (GB)</Label>
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={editStorageLimitGB}
                                    onChange={(e) => setEditStorageLimitGB(e.target.value)}
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max File Size (MB)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="1"
                                        value={editMaxFileSizeMB}
                                        onChange={(e) => {
                                            setEditMaxFileSizeMB(e.target.value);
                                            if (e.target.value) setUseSystemDefault(false);
                                        }}
                                        disabled={useSystemDefault}
                                        placeholder={`default: ${Math.round(SYSTEM_MAX_FILE_SIZE / (1024 * 1024))}`}
                                        className="bg-muted/50 border-border/50"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={useSystemDefault}
                                        onChange={(e) => {
                                            setUseSystemDefault(e.target.checked);
                                            if (e.target.checked) setEditMaxFileSizeMB("");
                                        }}
                                    />
                                    Use system default ({formatBytes(SYSTEM_MAX_FILE_SIZE)})
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => { setEditing(false); fetchTeamData(); }} disabled={saving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                Save
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <TeamStats team={team} />

            {/* Members */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Members
                        <Badge variant="secondary" className="text-[10px] ml-1">{team.members?.length || 0}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Search */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name or email..."
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") searchUsers(); }}
                                className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={searchUsers} disabled={searchingMembers || !memberSearch.trim()}>
                            {searchingMembers ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Search"}
                        </Button>
                    </div>

                    {memberResults.length > 0 && (
                        <div className="rounded-md border border-border/50 divide-y divide-border/50 max-h-48 overflow-y-auto">
                            {memberResults.map((u) => {
                                const isAlreadyMember = team.members?.some((m: TeamMember) => m._id === u._id);
                                return (
                                    <div key={u._id} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{u.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                        {isAlreadyMember ? (
                                            <Badge variant="secondary" className="text-[10px]">Member</Badge>
                                        ) : (
                                            <Button size="sm" variant="outline" onClick={() => addMember(u._id)}>
                                                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                                Add
                                            </Button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Current members */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Members</p>
                        {!team.members || team.members.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No members yet</p>
                        ) : (
                            <div className="rounded-md border border-border/50 divide-y divide-border/50">
                                {team.members.map((m: TeamMember) => (
                                    <div key={m._id} className="flex items-center justify-between px-3 py-2 text-sm">
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">{m.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                        </div>
                                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeMember(m._id)}>
                                            <UserMinus className="h-3.5 w-3.5 mr-1.5" />
                                            Remove
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Upload Panel (admin can upload on behalf of team) */}
            {team.status === "active" && (
                <UploadPanel
                    teamId={id}
                    team={team}
                    onUploaded={fetchTeamData}
                    onNewTextFile={() => setEditorState({ mode: "create" })}
                />
            )}

            {/* File List */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Files className="h-4 w-4 text-muted-foreground" />
                        All Files
                        <Badge variant="secondary" className="text-[10px] ml-1">{files.length}</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <FileTable
                        files={files}
                        canDelete={() => true}
                        canShare={() => team.status === "active"}
                        onDownload={handleDownload}
                        onDelete={(f) => setDeleteFileTarget(f)}
                        onPreview={handlePreview}
                        onInfo={handlePreview}
                        onShare={(f) => setShareFile(f)}
                    />
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-500/30 bg-red-500/[0.02]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-red-400 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Delete this team</p>
                        <p className="text-xs text-muted-foreground">
                            Permanently deletes the team, all files ({formatBytes(team.totalStorageUsed)}), and member associations.
                        </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteDialog(true)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete Team
                    </Button>
                </CardContent>
            </Card>

            {/* File Viewer Modal */}
            {viewerIndex !== null && (
                <FileViewerModal
                    files={previewableFiles}
                    startIndex={viewerIndex}
                    teamId={id}
                    onClose={() => setViewerIndex(null)}
                    onDownload={handleDownload}
                    canEdit={() => team.status === "active"}
                    onEdit={(file, content) => {
                        setViewerIndex(null);
                        setEditorState({
                            mode: "edit",
                            fileId: file._id,
                            fileName: file.fileName,
                            initialContent: content,
                        });
                    }}
                />
            )}

            {/* Text Editor Modal */}
            {editorState && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setEditorState(null);
                    }}
                >
                    <TextEditor
                        teamId={id}
                        mode={editorState.mode}
                        fileId={editorState.fileId}
                        fileName={editorState.fileName}
                        initialContent={editorState.initialContent}
                        onSaved={() => {
                            setEditorState(null);
                            fetchTeamData();
                        }}
                        onCancel={() => setEditorState(null)}
                    />
                </div>
            )}

            {/* Share Dialog */}
            <ShareDialog
                teamId={id}
                file={shareFile}
                members={team.members || []}
                onClose={() => setShareFile(null)}
                onSaved={fetchTeamData}
            />

            {/* Delete File Dialog */}
            <Dialog open={!!deleteFileTarget} onOpenChange={(open) => { if (!open) setDeleteFileTarget(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {deleteFileTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete File
                                </DialogTitle>
                                <DialogDescription>
                                    This will permanently delete the file from team storage.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                <p className="font-medium truncate">{deleteFileTarget.fileName}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    <HardDrive className="inline h-3 w-3 mr-1" />
                                    {formatBytes(deleteFileTarget.fileSize)}
                                </p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDeleteFileTarget(null)} disabled={deletingFile}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" onClick={handleDeleteFile} disabled={deletingFile}>
                                    {deletingFile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Suspend/Activate Dialog */}
            <Dialog open={!!statusDialog} onOpenChange={(open) => { if (!open) setStatusDialog(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {statusDialog && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {statusDialog === "suspend" ? (
                                        <Ban className="h-5 w-5 text-yellow-400" />
                                    ) : (
                                        <CheckCircle className="h-5 w-5 text-green-400" />
                                    )}
                                    {statusDialog === "suspend" ? "Suspend" : "Activate"} Team
                                </DialogTitle>
                                <DialogDescription>
                                    {statusDialog === "suspend"
                                        ? "Uploads will be disabled. Members can still download and preview files."
                                        : "Team members will be able to upload files again."}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setStatusDialog(null)} disabled={togglingStatus}>Cancel</Button>
                                <Button className="flex-1" onClick={handleToggleStatus} disabled={togglingStatus}>
                                    {togglingStatus && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {statusDialog === "suspend" ? "Suspend" : "Activate"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Team Dialog */}
            <Dialog open={deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(false); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            Delete Team
                        </DialogTitle>
                        <DialogDescription>
                            This permanently deletes the team, all files ({files.length}), and all member associations. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label>Admin password</Label>
                            <Input
                                type="password"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="Enter your password"
                                className="bg-muted/50 border-border/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>
                                Type <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-destructive">delete {team.name}</code> to confirm
                            </Label>
                            <Input
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder={`delete ${team.name}`}
                                className="bg-muted/50 border-border/50"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setDeleteDialog(false)} disabled={deleting}>Cancel</Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={handleDeleteTeam}
                            disabled={deleting || !deletePassword || !confirmTextMatches}
                        >
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Delete Team
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
