"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    ShieldPlus,
    Loader2,
    Copy,
    Check,
    RefreshCw,
    Plus,
    Shield,
    Mail,
    Calendar,
    Key,
    Ban,
    CheckCircle,
    Trash2,
    AlertTriangle,
} from "lucide-react";

interface AdminUser {
    _id: string;
    name: string;
    email: string;
    status?: string;
    createdAt: string;
}

function generatePassword(length = 16): string {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => chars[byte % chars.length]).join("");
}

export default function AdminManagementPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loadingAdmins, setLoadingAdmins] = useState(true);

    // Create form state
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [autoGenerate, setAutoGenerate] = useState(true);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // Change password state
    const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
    const [changePasswordAdmin, setChangePasswordAdmin] = useState<AdminUser | null>(null);
    const [newPassword, setNewPassword] = useState("");
    const [autoGenerateNewPassword, setAutoGenerateNewPassword] = useState(true);
    const [changingPassword, setChangingPassword] = useState(false);

    // Admin action state
    const [actionAdmin, setActionAdmin] = useState<AdminUser | null>(null);
    const [actionType, setActionType] = useState<"suspend" | "activate" | "delete" | null>(null);
    const [actionPassword, setActionPassword] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Credentials popup state
    const [showCredentials, setShowCredentials] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<{
        name: string;
        email: string;
        password: string;
    } | null>(null);

    useEffect(() => {
        fetchAdmins();
    }, []);

    async function fetchAdmins() {
        try {
            const res = await fetch("/api/admin/create-admin");
            if (res.ok) {
                const data = await res.json();
                setAdmins(data.admins || []);
            }
        } catch {
            toast.error("Failed to load admins");
        } finally {
            setLoadingAdmins(false);
        }
    }

    function handleAutoGenerate() {
        const generated = generatePassword();
        setPassword(generated);
        setAutoGenerate(true);
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const finalPassword = autoGenerate ? generatePassword() : password;

        try {
            const res = await fetch("/api/admin/create-admin", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password: finalPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to create admin");
                return;
            }

            // Show credentials popup
            setCreatedCredentials({ name, email, password: finalPassword });
            setShowCreateDialog(false);
            setShowCredentials(true);

            // Reset form
            setName("");
            setEmail("");
            setPassword("");
            setAutoGenerate(true);

            // Refresh admin list
            fetchAdmins();

            toast.success("Admin account created successfully");
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    function openChangePassword(admin: AdminUser) {
        setChangePasswordAdmin(admin);
        setNewPassword("");
        setAutoGenerateNewPassword(true);
        setShowChangePasswordDialog(true);
    }

    async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!changePasswordAdmin) return;
        setChangingPassword(true);

        const finalPassword = autoGenerateNewPassword ? generatePassword() : newPassword;

        try {
            const res = await fetch("/api/admin/create-admin", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: changePasswordAdmin._id, newPassword: finalPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Failed to change password");
                return;
            }

            setShowChangePasswordDialog(false);
            setCreatedCredentials({ name: changePasswordAdmin.name, email: changePasswordAdmin.email, password: finalPassword });
            setShowCredentials(true);
            toast.success("Password updated successfully");
        } catch {
            toast.error("Something went wrong");
        } finally {
            setChangingPassword(false);
        }
    }

    async function copyCredentials() {
        if (!createdCredentials) return;
        const text = `Admin Credentials\n-----------------\nName: ${createdCredentials.name}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Credentials copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
    }

    function openAction(admin: AdminUser, type: "suspend" | "activate" | "delete") {
        setActionAdmin(admin);
        setActionType(type);
        setActionPassword("");
    }

    async function confirmAction() {
        if (!actionAdmin || !actionType) return;
        if (actionType === "delete" && !actionPassword) {
            toast.error("Password is required");
            return;
        }
        setActionLoading(true);
        try {
            const res = await fetch("/api/admin/create-admin", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: actionAdmin._id,
                    action: actionType,
                    ...(actionType === "delete" && { password: actionPassword }),
                }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || "Action failed"); return; }

            if (actionType === "delete") {
                setAdmins(admins.filter((a) => a._id !== actionAdmin._id));
                toast.success("Admin deleted");
            } else if (actionType === "suspend") {
                setAdmins(admins.map((a) => a._id === actionAdmin._id ? { ...a, status: "suspended" } : a));
                toast.success("Admin suspended");
            } else {
                setAdmins(admins.map((a) => a._id === actionAdmin._id ? { ...a, status: "active" } : a));
                toast.success("Admin activated");
            }
        } catch { toast.error("Something went wrong"); }
        finally {
            setActionLoading(false);
            setActionAdmin(null);
            setActionType(null);
            setActionPassword("");
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Management</h1>
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Admin
                </Button>
            </div>

            {/* Admin List */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin Users ({admins.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingAdmins ? (
                        <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : admins.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No admin users found.
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead className="w-[180px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {admins.map((admin) => {
                                    const adminStatus = admin.status || "active";
                                    return (
                                        <TableRow key={admin._id} className={adminStatus === "suspended" ? "opacity-60" : ""}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                        <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                    <span className="font-medium text-sm">{admin.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Mail className="h-3.5 w-3.5" />
                                                    {admin.email}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={adminStatus === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                                                    {adminStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    {new Date(admin.createdAt).toLocaleDateString()}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1 text-xs"
                                                        onClick={() => openChangePassword(admin)}
                                                    >
                                                        <Key className="h-3.5 w-3.5" />
                                                        Password
                                                    </Button>
                                                    {adminStatus === "active" ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-yellow-500"
                                                            title="Suspend"
                                                            onClick={() => openAction(admin, "suspend")}
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-green-500"
                                                            title="Activate"
                                                            onClick={() => openAction(admin, "activate")}
                                                        >
                                                            <CheckCircle className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        title="Delete"
                                                        onClick={() => openAction(admin, "delete")}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Create Admin Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="border-border/50 bg-background sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldPlus className="h-5 w-5" />
                            Create New Admin
                        </DialogTitle>
                        <DialogDescription>
                            Add a new administrator to the platform.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Admin name"
                                required
                                className="bg-muted/50 border-border/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                required
                                className="bg-muted/50 border-border/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => {
                                        if (!autoGenerate) {
                                            handleAutoGenerate();
                                        } else {
                                            setAutoGenerate(false);
                                            setPassword("");
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    {autoGenerate ? "Enter manually" : "Auto-generate"}
                                </Button>
                            </div>
                            {autoGenerate ? (
                                <p className="text-sm text-muted-foreground bg-muted/50 border border-border/50 rounded-md px-3 py-2">
                                    Password will be auto-generated
                                </p>
                            ) : (
                                <Input
                                    id="password"
                                    type="text"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    minLength={6}
                                    required
                                    className="bg-muted/50 border-border/50"
                                />
                            )}
                        </div>

                        <Button type="submit" disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Admin
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Change Password Dialog */}
            <Dialog open={showChangePasswordDialog} onOpenChange={setShowChangePasswordDialog}>
                <DialogContent className="border-border/50 bg-background sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            Change Password
                        </DialogTitle>
                        <DialogDescription>
                            Set a new password for {changePasswordAdmin?.name}.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={onChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="newPassword">New Password</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => {
                                        if (!autoGenerateNewPassword) {
                                            const generated = generatePassword();
                                            setNewPassword(generated);
                                            setAutoGenerateNewPassword(true);
                                        } else {
                                            setAutoGenerateNewPassword(false);
                                            setNewPassword("");
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-3 w-3" />
                                    {autoGenerateNewPassword ? "Enter manually" : "Auto-generate"}
                                </Button>
                            </div>
                            {autoGenerateNewPassword ? (
                                <p className="text-sm text-muted-foreground bg-muted/50 border border-border/50 rounded-md px-3 py-2">
                                    Password will be auto-generated
                                </p>
                            ) : (
                                <Input
                                    id="newPassword"
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Min 6 characters"
                                    minLength={6}
                                    required
                                    className="bg-muted/50 border-border/50"
                                />
                            )}
                        </div>

                        <Button type="submit" disabled={changingPassword} className="w-full">
                            {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Admin Action Dialog */}
            <Dialog open={!!actionType} onOpenChange={(open) => { if (!open) { setActionType(null); setActionAdmin(null); setActionPassword(""); } }}>
                <DialogContent className="border-border/50 bg-background max-w-sm">
                    {actionType && actionAdmin && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertTriangle className={`h-5 w-5 ${actionType === "activate" ? "text-green-500" : "text-destructive"}`} />
                                    {actionType === "delete" ? "Delete Admin" : actionType === "suspend" ? "Suspend Admin" : "Activate Admin"}
                                </DialogTitle>
                                <DialogDescription>
                                    {actionType === "delete"
                                        ? "This will permanently delete this admin account. Enter your password to confirm."
                                        : actionType === "suspend"
                                        ? "This admin will not be able to log in until reactivated."
                                        : "This admin will be able to log in again."
                                    }
                                </DialogDescription>
                            </DialogHeader>
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-3 text-sm">
                                <p className="font-medium">{actionAdmin.name}</p>
                                <p className="text-muted-foreground text-xs">{actionAdmin.email}</p>
                            </div>
                            {actionType === "delete" && (
                                <div className="space-y-2">
                                    <Label>Your Password</Label>
                                    <Input
                                        type="password"
                                        placeholder="Enter your password to confirm"
                                        value={actionPassword}
                                        onChange={(e) => setActionPassword(e.target.value)}
                                        className="bg-muted/50 border-border/50"
                                    />
                                </div>
                            )}
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" className="flex-1" onClick={() => { setActionType(null); setActionAdmin(null); setActionPassword(""); }} disabled={actionLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    variant={actionType === "activate" ? "default" : "destructive"}
                                    className="flex-1"
                                    onClick={confirmAction}
                                    disabled={actionLoading || (actionType === "delete" && !actionPassword)}
                                >
                                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {actionType === "delete" ? "Delete" : actionType === "suspend" ? "Suspend" : "Activate"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Credentials Popup */}
            <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldPlus className="h-5 w-5 text-green-500" />
                            Admin Created Successfully
                        </DialogTitle>
                        <DialogDescription>
                            Save these credentials now. The password cannot be retrieved later.
                        </DialogDescription>
                    </DialogHeader>
                    {createdCredentials && (
                        <div className="space-y-4">
                            <div className="rounded-lg bg-muted/50 border border-border/50 p-4 space-y-2 font-mono text-sm">
                                <div>
                                    <span className="text-muted-foreground">Name: </span>
                                    <span className="font-medium">{createdCredentials.name}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Email: </span>
                                    <span className="font-medium">{createdCredentials.email}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Password: </span>
                                    <span className="font-medium break-all">{createdCredentials.password}</span>
                                </div>
                            </div>
                            <Button
                                onClick={copyCredentials}
                                className="w-full gap-2"
                                variant={copied ? "secondary" : "default"}
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4" />
                                        Copy Credentials
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
