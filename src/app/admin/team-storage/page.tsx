"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    FolderArchive,
    Search,
    Plus,
    Pencil,
    Trash2,
    Users,
    Files,
    HardDrive,
    AlertTriangle,
    Loader2,
    Ban,
    CheckCircle,
    UserPlus,
    UserMinus,
    Calendar,
    List,
    LayoutGrid,
} from "lucide-react";
import type { TeamItem, TeamMember } from "@/types";

interface UserSearchResult {
    _id: string;
    name: string;
    email: string;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function AdminTeamStoragePage() {
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"card" | "table">("card");

    // Create dialog
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createDesc, setCreateDesc] = useState("");
    const [createLimit, setCreateLimit] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit dialog
    const [editTeam, setEditTeam] = useState<TeamItem | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editLimit, setEditLimit] = useState("");
    const [editing, setEditing] = useState(false);

    // Delete dialog
    const [deleteTeam, setDeleteTeam] = useState<TeamItem | null>(null);
    const [deletePassword, setDeletePassword] = useState("");
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deleting, setDeleting] = useState(false);

    // Members dialog
    const [membersTeam, setMembersTeam] = useState<TeamItem | null>(null);
    const [memberSearch, setMemberSearch] = useState("");
    const [memberResults, setMemberResults] = useState<UserSearchResult[]>([]);
    const [memberSearching, setMemberSearching] = useState(false);
    const [addingMember, setAddingMember] = useState(false);
    const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

    // Suspend dialog
    const [suspendTeam, setSuspendTeam] = useState<TeamItem | null>(null);
    const [suspending, setSuspending] = useState(false);

    useEffect(() => {
        fetchTeams();
    }, []);

    async function fetchTeams() {
        try {
            const res = await fetch("/api/admin/team-storage");
            const data = await res.json();
            setTeams(data.teams || []);
        } catch {
            toast.error("Failed to load teams");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate() {
        if (!createName.trim() || !createLimit) return;
        setCreating(true);
        try {
            const res = await fetch("/api/admin/team-storage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDesc.trim(),
                    storageLimit: parseFloat(createLimit) * 1024 * 1024 * 1024,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success("Team created");
            setShowCreate(false);
            setCreateName("");
            setCreateDesc("");
            setCreateLimit("");
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setCreating(false); }
    }

    function openEdit(team: TeamItem) {
        setEditTeam(team);
        setEditName(team.name);
        setEditDesc(team.description || "");
        setEditLimit((team.storageLimit / (1024 * 1024 * 1024)).toString());
    }

    async function handleEdit() {
        if (!editTeam || !editName.trim() || !editLimit) return;
        setEditing(true);
        try {
            const res = await fetch(`/api/admin/team-storage/${editTeam._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDesc.trim(),
                    storageLimit: parseFloat(editLimit) * 1024 * 1024 * 1024,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success("Team updated");
            setEditTeam(null);
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setEditing(false); }
    }

    function openDelete(team: TeamItem) {
        setDeleteTeam(team);
        setDeletePassword("");
        setDeleteConfirm("");
    }

    async function handleDelete() {
        if (!deleteTeam) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/admin/team-storage/${deleteTeam._id}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    password: deletePassword,
                    confirmText: deleteConfirm,
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success("Team deleted");
            setDeleteTeam(null);
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setDeleting(false); }
    }

    async function handleSuspendToggle() {
        if (!suspendTeam) return;
        setSuspending(true);
        const newStatus = suspendTeam.status === "active" ? "suspended" : "active";
        try {
            const res = await fetch(`/api/admin/team-storage/${suspendTeam._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success(`Team ${newStatus === "suspended" ? "suspended" : "activated"}`);
            setSuspendTeam(null);
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setSuspending(false); }
    }

    function openMembers(team: TeamItem) {
        setMembersTeam(team);
        setMemberSearch("");
        setMemberResults([]);
    }

    async function searchUsers() {
        if (!memberSearch.trim()) return;
        setMemberSearching(true);
        try {
            const res = await fetch(`/api/admin/users?search=${encodeURIComponent(memberSearch)}`);
            const data = await res.json();
            setMemberResults(data.users || []);
        } catch { toast.error("Search failed"); }
        finally { setMemberSearching(false); }
    }

    async function addMember(userId: string) {
        if (!membersTeam) return;
        setAddingMember(true);
        try {
            const res = await fetch(`/api/admin/team-storage/${membersTeam._id}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success("Member added");
            setMembersTeam({ ...membersTeam, members: data.team.members });
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setAddingMember(false); }
    }

    async function removeMember(userId: string) {
        if (!membersTeam) return;
        setRemovingMemberId(userId);
        try {
            const res = await fetch(`/api/admin/team-storage/${membersTeam._id}/members`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error); return; }
            toast.success("Member removed");
            setMembersTeam({ ...membersTeam, members: data.team.members });
            fetchTeams();
        } catch { toast.error("Something went wrong"); }
        finally { setRemovingMemberId(null); }
    }

    const expectedConfirmText = deleteTeam ? `delete ${deleteTeam.name}` : "";
    const confirmMatch = deleteConfirm.trim().toLowerCase() === expectedConfirmText.toLowerCase();

    const filtered = teams.filter(
        (t) =>
            !search ||
            t.name.toLowerCase().includes(search.toLowerCase())
    );

    const usagePercent = (used: number, limit: number) =>
        limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

    return (
        <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Team Storage</h1>
                <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" />
                    Create Team
                </Button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search teams..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                    />
                </div>
                <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                    <button
                        onClick={() => setViewMode("card")}
                        className={`p-1.5 transition-colors ${viewMode === "card" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("table")}
                        className={`p-1.5 transition-colors ${viewMode === "table" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <List className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <FolderArchive className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {teams.length === 0 ? "No teams yet" : "No teams match your search"}
                        </p>
                    </CardContent>
                </Card>
            ) : viewMode === "card" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((team) => {
                        const pct = usagePercent(team.totalStorageUsed, team.storageLimit);
                        return (
                            <Card key={team._id} className="border-border/50">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-base">{team.name}</h3>
                                            {team.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{team.description}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge className={`text-[10px] ${statusColors[team.status]}`}>
                                                    {team.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMembers(team)}>
                                                <UserPlus className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(team)}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3 text-center">
                                        <div>
                                            <Users className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                                            <p className="text-sm font-semibold tabular-nums">{team.memberCount}</p>
                                            <p className="text-[10px] text-muted-foreground">Members</p>
                                        </div>
                                        <div>
                                            <Files className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                                            <p className="text-sm font-semibold tabular-nums">{team.fileCount}</p>
                                            <p className="text-[10px] text-muted-foreground">Files</p>
                                        </div>
                                        <div>
                                            <HardDrive className="h-3.5 w-3.5 mx-auto text-muted-foreground mb-1" />
                                            <p className="text-sm font-semibold tabular-nums">{formatBytes(team.totalStorageUsed)}</p>
                                            <p className="text-[10px] text-muted-foreground">Used</p>
                                        </div>
                                    </div>

                                    {/* Storage bar */}
                                    <div>
                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                            <span>{formatBytes(team.totalStorageUsed)} / {formatBytes(team.storageLimit)}</span>
                                            <span>{pct.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-400/60"}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-7 text-xs gap-1"
                                            onClick={() => setSuspendTeam(team)}
                                        >
                                            {team.status === "active" ? <Ban className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                                            {team.status === "active" ? "Suspend" : "Activate"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                            onClick={() => openDelete(team)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Members</TableHead>
                                    <TableHead>Files</TableHead>
                                    <TableHead>Storage</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[120px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((team) => (
                                    <TableRow key={team._id}>
                                        <TableCell className="font-medium">{team.name}</TableCell>
                                        <TableCell>
                                            <Badge className={`text-[10px] ${statusColors[team.status]}`}>
                                                {team.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="tabular-nums">{team.memberCount}</TableCell>
                                        <TableCell className="tabular-nums">{team.fileCount}</TableCell>
                                        <TableCell>
                                            <span className="text-sm">{formatBytes(team.totalStorageUsed)}</span>
                                            <span className="text-xs text-muted-foreground"> / {formatBytes(team.storageLimit)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(team.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMembers(team)}>
                                                    <UserPlus className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(team)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSuspendTeam(team)}>
                                                    {team.status === "active" ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete(team)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-muted-foreground">
                {filtered.length} team{filtered.length !== 1 ? "s" : ""}
            </p>

            {/* Create Dialog */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Team</DialogTitle>
                        <DialogDescription>Create a new team storage space.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Team Name</Label>
                            <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Project Alpha" className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="What is this team for?" rows={2} className="bg-muted/50 border-border/50 resize-none" />
                        </div>
                        <div className="space-y-2">
                            <Label>Storage Limit</Label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[5, 10, 20].map((gb) => (
                                    <Button
                                        key={gb}
                                        type="button"
                                        variant={createLimit === String(gb) ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setCreateLimit(String(gb))}
                                    >
                                        {gb} GB
                                    </Button>
                                ))}
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={createLimit}
                                    onChange={(e) => setCreateLimit(e.target.value)}
                                    placeholder="Custom GB"
                                    className="bg-muted/50 border-border/50 h-8 w-28 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
                            <Button className="flex-1" onClick={handleCreate} disabled={creating || !createName.trim() || !createLimit}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) setEditTeam(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Team</DialogTitle>
                        <DialogDescription>Update team settings.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Team Name</Label>
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted/50 border-border/50" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What is this team for?" rows={2} className="bg-muted/50 border-border/50 resize-none" />
                        </div>
                        <div className="space-y-2">
                            <Label>Storage Limit</Label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {[5, 10, 20].map((gb) => (
                                    <Button
                                        key={gb}
                                        type="button"
                                        variant={editLimit === String(gb) ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 text-xs"
                                        onClick={() => setEditLimit(String(gb))}
                                    >
                                        {gb} GB
                                    </Button>
                                ))}
                                <Input
                                    type="number"
                                    min="0.1"
                                    step="0.1"
                                    value={editLimit}
                                    onChange={(e) => setEditLimit(e.target.value)}
                                    placeholder="Custom GB"
                                    className="bg-muted/50 border-border/50 h-8 w-28 text-xs"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setEditTeam(null)} disabled={editing}>Cancel</Button>
                            <Button className="flex-1" onClick={handleEdit} disabled={editing || !editName.trim() || !editLimit}>
                                {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={!!deleteTeam} onOpenChange={(open) => { if (!open) setDeleteTeam(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-md">
                    {deleteTeam && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-destructive" />
                                    Delete Team
                                </DialogTitle>
                                <DialogDescription>
                                    This will permanently delete the team, all its files from storage, and cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                <p className="font-medium">{deleteTeam.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {deleteTeam.fileCount} files &middot; {formatBytes(deleteTeam.totalStorageUsed)} &middot; {deleteTeam.memberCount} members
                                </p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Admin Password</Label>
                                    <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" className="bg-muted/50 border-border/50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>
                                        Type <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-destructive">{expectedConfirmText}</code> to confirm
                                    </Label>
                                    <Input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={expectedConfirmText} className="bg-muted/50 border-border/50" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setDeleteTeam(null)} disabled={deleting}>Cancel</Button>
                                <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting || !deletePassword || !confirmMatch}>
                                    {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                    Delete
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Suspend Dialog */}
            <Dialog open={!!suspendTeam} onOpenChange={(open) => { if (!open) setSuspendTeam(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {suspendTeam && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {suspendTeam.status === "active" ? "Suspend" : "Activate"} Team
                                </DialogTitle>
                                <DialogDescription>
                                    {suspendTeam.status === "active"
                                        ? "Suspending will prevent all uploads. Existing files will remain accessible."
                                        : "Activating will re-enable uploads for this team."
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm font-medium">
                                {suspendTeam.name}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => setSuspendTeam(null)} disabled={suspending}>Cancel</Button>
                                <Button
                                    variant={suspendTeam.status === "active" ? "destructive" : "default"}
                                    className="flex-1"
                                    onClick={handleSuspendToggle}
                                    disabled={suspending}
                                >
                                    {suspending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {suspendTeam.status === "active" ? "Suspend" : "Activate"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Members Dialog */}
            <Dialog open={!!membersTeam} onOpenChange={(open) => { if (!open) setMembersTeam(null); }}>
                <DialogContent className="border-border/50 bg-background max-w-lg">
                    {membersTeam && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Manage Members — {membersTeam.name}</DialogTitle>
                                <DialogDescription>Add or remove team members.</DialogDescription>
                            </DialogHeader>

                            {/* Add member search */}
                            <div className="space-y-2">
                                <Label>Add Member</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={memberSearch}
                                        onChange={(e) => setMemberSearch(e.target.value)}
                                        placeholder="Search by name or email..."
                                        className="bg-muted/50 border-border/50"
                                        onKeyDown={(e) => { if (e.key === "Enter") searchUsers(); }}
                                    />
                                    <Button variant="outline" size="sm" onClick={searchUsers} disabled={memberSearching || !memberSearch.trim()}>
                                        {memberSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {memberResults.length > 0 && (
                                    <div className="border border-border/50 rounded-lg divide-y divide-border/50 max-h-40 overflow-y-auto">
                                        {memberResults.map((u) => {
                                            const alreadyMember = membersTeam.members.some((m: TeamMember) => m._id === u._id);
                                            return (
                                                <div key={u._id} className="flex items-center justify-between px-3 py-2 text-sm">
                                                    <div>
                                                        <p className="font-medium">{u.name}</p>
                                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                                    </div>
                                                    {alreadyMember ? (
                                                        <Badge variant="secondary" className="text-[10px]">Member</Badge>
                                                    ) : (
                                                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addMember(u._id)} disabled={addingMember}>
                                                            <UserPlus className="h-3 w-3" />
                                                            Add
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Current members */}
                            <div className="space-y-2">
                                <Label>Current Members ({membersTeam.members.length})</Label>
                                <div className="border border-border/50 rounded-lg divide-y divide-border/50 max-h-56 overflow-y-auto">
                                    {membersTeam.members.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No members yet</p>
                                    ) : (
                                        membersTeam.members.map((m: TeamMember) => (
                                            <div key={m._id} className="flex items-center justify-between px-3 py-2 text-sm">
                                                <div>
                                                    <p className="font-medium">{m.name}</p>
                                                    <p className="text-xs text-muted-foreground">{m.email}</p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                                    onClick={() => removeMember(m._id)}
                                                    disabled={removingMemberId === m._id}
                                                >
                                                    {removingMemberId === m._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                                                    Remove
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
