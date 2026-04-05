"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    Users,
    Calendar,
    Search,
    Trash2,
    Ban,
    CheckCircle,
    AlertTriangle,
    Loader2,
    Mail,
    Hash,
} from "lucide-react";

interface UserEntry {
    _id: string;
    name: string;
    email: string;
    registerNumber?: string;
    role: string;
    status?: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border-green-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
};


export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Action dialog
    const [actionUser, setActionUser] = useState<UserEntry | null>(null);
    const [actionType, setActionType] = useState<"delete" | "suspend" | "activate" | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    }

    function openAction(user: UserEntry, type: "delete" | "suspend" | "activate") {
        setActionUser(user);
        setActionType(type);
    }

    async function confirmAction() {
        if (!actionUser || !actionType) return;
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: actionUser._id, action: actionType }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Action failed");
                return;
            }

            if (actionType === "delete") {
                setUsers(users.filter((u) => u._id !== actionUser._id));
                toast.success("User deleted");
            } else if (actionType === "suspend") {
                setUsers(users.map((u) => u._id === actionUser._id ? { ...u, status: "suspended" } : u));
                toast.success("User suspended");
            } else if (actionType === "activate") {
                setUsers(users.map((u) => u._id === actionUser._id ? { ...u, status: "active" } : u));
                toast.success("User activated");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setActionLoading(false);
            setActionUser(null);
            setActionType(null);
        }
    }

    const filtered = users.filter((u) => {
        const matchesSearch = !search ||
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            (u.registerNumber || "").toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "all" || (u.status || "active") === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const actionMessages = {
        delete: { title: "Delete User", description: "This will permanently delete the user account and cannot be undone.", button: "Delete", variant: "destructive" as const },
        suspend: { title: "Suspend User", description: "The user will not be able to log in until their account is reactivated.", button: "Suspend", variant: "destructive" as const },
        activate: { title: "Activate User", description: "The user will be able to log in again.", button: "Activate", variant: "default" as const },
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                <Badge variant="secondary" className="text-sm">{users.length} users</Badge>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search name, email, register no..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50 border-border/50 h-9 text-sm"
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-muted/50 border-border/50 h-9 text-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">
                            {users.length === 0 ? "No users found" : "No users match your filters"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Register No.</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="w-[120px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((user) => {
                                    const userStatus = user.status || "active";
                                    return (
                                        <TableRow key={user._id} className={userStatus === "suspended" ? "opacity-60" : ""}>
                                            <TableCell>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">{user.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                        <Mail className="h-3 w-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {user.registerNumber ? (
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Hash className="h-3 w-3 text-muted-foreground" />
                                                        {user.registerNumber}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={statusColors[userStatus] || statusColors.active}>
                                                    {userStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {userStatus === "active" ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-yellow-500"
                                                            title="Suspend user"
                                                            onClick={() => openAction(user, "suspend")}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-green-500"
                                                            title="Activate user"
                                                            onClick={() => openAction(user, "activate")}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        title="Delete user"
                                                        onClick={() => openAction(user, "delete")}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-muted-foreground">
                {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
            </p>

            {/* Action Confirmation Dialog */}
            <Dialog open={!!actionType} onOpenChange={(open) => { if (!open) { setActionType(null); setActionUser(null); } }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {actionType && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className={`h-5 w-5 ${actionType === "activate" ? "text-green-500" : "text-destructive"}`} />
                                    {actionMessages[actionType].title}
                                </DialogTitle>
                                <DialogDescription>
                                    {actionMessages[actionType].description}
                                </DialogDescription>
                            </DialogHeader>
                            {actionUser && (
                                <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                    <p className="font-medium">{actionUser.name}</p>
                                    <p className="text-muted-foreground text-xs">{actionUser.email}</p>
                                    {actionUser.registerNumber && (
                                        <p className="text-muted-foreground text-xs">Reg: {actionUser.registerNumber}</p>
                                    )}
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => { setActionType(null); setActionUser(null); }} disabled={actionLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    variant={actionMessages[actionType].variant}
                                    className="flex-1"
                                    onClick={confirmAction}
                                    disabled={actionLoading}
                                >
                                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {actionMessages[actionType].button}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
