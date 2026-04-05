"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    User,
    Mail,
    ShieldCheck,
    ShieldOff,
    Loader2,
    Copy,
    Check,
    KeyRound,
} from "lucide-react";

export default function UserProfilePage() {
    const { data: session, status, update } = useSession();
    const totpEnabled = (session?.user as any)?.totpEnabled ?? false;

    // MFA setup state
    const [setupActive, setSetupActive] = useState(false);
    const [setupStep, setSetupStep] = useState(1);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [manualSecret, setManualSecret] = useState("");
    const [setupLoading, setSetupLoading] = useState(false);
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [verifying, setVerifying] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // MFA disable state
    const [disableActive, setDisableActive] = useState(false);
    const [password, setPassword] = useState("");
    const [disableCode, setDisableCode] = useState("");
    const [disabling, setDisabling] = useState(false);

    // Change password state
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [currentPw, setCurrentPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    const [changingPw, setChangingPw] = useState(false);

    async function startSetup() {
        setSetupActive(true);
        setSetupStep(1);
        setSetupLoading(true);
        setCode(["", "", "", "", "", ""]);
        try {
            const res = await fetch("/api/auth/totp/setup", { method: "POST" });
            if (!res.ok) { toast.error("Failed to initialize MFA setup"); setSetupActive(false); return; }
            const data = await res.json();
            setQrCodeDataUrl(data.qrCodeDataUrl);
            setManualSecret(data.manualSecret);
        } catch { toast.error("Failed to initialize MFA setup"); setSetupActive(false); }
        finally { setSetupLoading(false); }
    }

    function handleDigitChange(index: number, value: string) {
        if (!/^\d*$/.test(value)) return;
        const next = [...code];
        next[index] = value.slice(-1);
        setCode(next);
        if (value && index < 5) inputRefs.current[index + 1]?.focus();
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        const next = [...code];
        for (let i = 0; i < 6; i++) next[i] = pasted[i] || "";
        setCode(next);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }

    async function onVerify(e: React.FormEvent) {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length !== 6) { toast.error("Please enter a 6-digit code"); return; }
        setVerifying(true);
        try {
            const res = await fetch("/api/auth/totp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: fullCode }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Invalid code");
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                return;
            }
            await update({ totpEnabled: true });
            toast.success("Two-factor authentication enabled!");
            setSetupActive(false);
        } catch { toast.error("Something went wrong"); }
        finally { setVerifying(false); }
    }

    async function onDisable(e: React.FormEvent) {
        e.preventDefault();
        if (!password || !disableCode) { toast.error("Please fill in all fields"); return; }
        setDisabling(true);
        try {
            const res = await fetch("/api/auth/totp/disable", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, code: disableCode }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to disable MFA");
                return;
            }
            await update({ totpEnabled: false });
            toast.success("Two-factor authentication disabled");
            setDisableActive(false);
            setPassword("");
            setDisableCode("");
        } catch { toast.error("Something went wrong"); }
        finally { setDisabling(false); }
    }

    async function onChangePassword(e: React.FormEvent) {
        e.preventDefault();
        if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
        if (newPw.length < 6) { toast.error("New password must be at least 6 characters"); return; }
        setChangingPw(true);
        try {
            const res = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || "Failed to change password"); return; }
            toast.success("Password changed successfully");
            setShowChangePassword(false);
            setCurrentPw("");
            setNewPw("");
            setConfirmPw("");
        } catch { toast.error("Something went wrong"); }
        finally { setChangingPw(false); }
    }

    if (status === "loading") {
        return <div className="p-6 max-w-2xl space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
    }

    const user = session?.user;
    if (!user) return null;

    return (
        <div className="p-6 max-w-2xl space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

            {/* User Info */}
            <Card className="border-border/50">
                <CardContent className="p-6">
                    <div className="flex items-start gap-5">
                        <div className="h-16 w-16 rounded-full bg-muted border border-border/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold">{user.name?.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <h2 className="text-xl font-semibold">{user.name}</h2>
                                <Badge variant="secondary" className="mt-1">
                                    <User className="h-3 w-3 mr-1" />
                                    User
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span>{user.email}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security - MFA Status */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${totpEnabled ? "bg-green-500/10 text-green-600" : "bg-muted"}`}>
                                {totpEnabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
                            </div>
                            <div>
                                <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                                <CardDescription>
                                    {totpEnabled ? "Your account is protected with TOTP" : "Add extra security to your account (optional)"}
                                </CardDescription>
                            </div>
                        </div>
                        {totpEnabled && (
                            <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-600">Enabled</span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {!totpEnabled && !setupActive && (
                        <Button onClick={startSetup}>Enable MFA</Button>
                    )}
                    {totpEnabled && !disableActive && (
                        <Button variant="destructive" onClick={() => setDisableActive(true)}>Disable MFA</Button>
                    )}
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="border-border/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <KeyRound className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Password</CardTitle>
                                <CardDescription>Change your account password</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!showChangePassword ? (
                        <Button variant="outline" onClick={() => setShowChangePassword(true)}>Change Password</Button>
                    ) : (
                        <form onSubmit={onChangePassword} className="space-y-4 max-w-sm">
                            <div className="space-y-2">
                                <Label>Current Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Enter current password"
                                    value={currentPw}
                                    onChange={(e) => setCurrentPw(e.target.value)}
                                    required
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>New Password</Label>
                                <Input
                                    type="password"
                                    placeholder="At least 6 characters"
                                    value={newPw}
                                    onChange={(e) => setNewPw(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Confirm New Password</Label>
                                <Input
                                    type="password"
                                    placeholder="Re-enter new password"
                                    value={confirmPw}
                                    onChange={(e) => setConfirmPw(e.target.value)}
                                    required
                                    className="bg-muted/50 border-border/50"
                                />
                                {confirmPw && newPw !== confirmPw && (
                                    <p className="text-xs text-red-400">Passwords do not match</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => { setShowChangePassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={changingPw || !currentPw || !newPw || newPw !== confirmPw || newPw.length < 6}
                                >
                                    {changingPw && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Password
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* MFA Setup Flow */}
            {setupActive && !totpEnabled && (
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base">Set Up Two-Factor Authentication</CardTitle>
                        <div className="flex items-center gap-4 pt-2">
                            {[1, 2].map((s) => (
                                <div key={s} className="flex items-center gap-2">
                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${setupStep === s ? "bg-foreground text-background" : "bg-foreground/10 text-muted-foreground"}`}>{s}</div>
                                    <span className={`text-sm ${setupStep === s ? "font-medium" : "text-muted-foreground"}`}>{s === 1 ? "Scan QR" : "Verify"}</span>
                                    {s === 1 && <div className="h-px w-6 bg-border" />}
                                </div>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {setupStep === 1 && (
                            <div className="space-y-4">
                                {setupLoading ? (
                                    <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                                ) : (
                                    <>
                                        <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                        {qrCodeDataUrl && (
                                            <div className="flex justify-center">
                                                <div className="rounded-lg border border-border/50 bg-white p-3">
                                                    <img src={qrCodeDataUrl} alt="MFA QR Code" width={200} height={200} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <p className="text-xs text-muted-foreground">Or enter this secret manually:</p>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 rounded-md bg-muted/50 border border-border/50 px-3 py-2 text-xs font-mono select-all break-all">{manualSecret}</code>
                                                <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={async () => { await navigator.clipboard.writeText(manualSecret); setCopied(true); toast.success("Copied!"); setTimeout(() => setCopied(false), 2000); }}>
                                                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={() => setSetupActive(false)}>Cancel</Button>
                                            <Button onClick={() => { setSetupStep(2); setTimeout(() => inputRefs.current[0]?.focus(), 100); }}>Next</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {setupStep === 2 && (
                            <form onSubmit={onVerify} className="space-y-4">
                                <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
                                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                                    {code.map((digit, i) => (
                                        <Input key={i} ref={(el) => { inputRefs.current[i] = el; }} type="text" inputMode="numeric" maxLength={1} value={digit}
                                            onChange={(e) => handleDigitChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)}
                                            className="w-12 h-12 text-center text-lg font-semibold bg-muted/50 border-border/50" />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" onClick={() => setSetupStep(1)}>Back</Button>
                                    <Button type="submit" disabled={verifying || code.join("").length !== 6}>
                                        {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Verify & Enable
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Disable MFA Flow */}
            {disableActive && totpEnabled && (
                <Card className="border-border/50 border-destructive/30">
                    <CardHeader>
                        <CardTitle className="text-base">Disable Two-Factor Authentication</CardTitle>
                        <CardDescription>Enter your password and a TOTP code to disable MFA.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onDisable} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Current Password</Label>
                                <Input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-muted/50 border-border/50" />
                            </div>
                            <div className="space-y-2">
                                <Label>Authenticator Code</Label>
                                <Input type="text" inputMode="numeric" placeholder="6-digit code" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))} required className="bg-muted/50 border-border/50" />
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => { setDisableActive(false); setPassword(""); setDisableCode(""); }}>Cancel</Button>
                                <Button type="submit" variant="destructive" disabled={disabling || !password || disableCode.length !== 6}>
                                    {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Disable MFA
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
