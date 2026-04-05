"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Copy, Check } from "lucide-react";

export default function MfaSetupPage() {
    const router = useRouter();
    const { update } = useSession();
    const [step, setStep] = useState(1);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [manualSecret, setManualSecret] = useState("");
    const [setupLoading, setSetupLoading] = useState(true);
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [verifying, setVerifying] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        async function fetchSetup() {
            try {
                const res = await fetch("/api/auth/totp/setup", {
                    method: "POST",
                });
                if (!res.ok) {
                    toast.error("Failed to initialize MFA setup");
                    return;
                }
                const data = await res.json();
                setQrCodeDataUrl(data.qrCodeDataUrl);
                setManualSecret(data.manualSecret);
            } catch {
                toast.error("Failed to initialize MFA setup");
            } finally {
                setSetupLoading(false);
            }
        }
        fetchSetup();
    }, []);

    function handleDigitChange(index: number, value: string) {
        if (!/^\d*$/.test(value)) return;
        const digit = value.slice(-1);
        const next = [...code];
        next[index] = digit;
        setCode(next);

        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    }

    function handleKeyDown(index: number, e: React.KeyboardEvent) {
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    }

    function handlePaste(e: React.ClipboardEvent) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 0) return;
        const next = [...code];
        for (let i = 0; i < 6; i++) {
            next[i] = pasted[i] || "";
        }
        setCode(next);
        const focusIndex = Math.min(pasted.length, 5);
        inputRefs.current[focusIndex]?.focus();
    }

    async function copySecret() {
        try {
            await navigator.clipboard.writeText(manualSecret);
            setCopied(true);
            toast.success("Secret copied to clipboard");
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    }

    async function onVerify(e: React.FormEvent) {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length !== 6) {
            toast.error("Please enter a 6-digit code");
            return;
        }

        setVerifying(true);
        try {
            const res = await fetch("/api/auth/totp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: fullCode }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.message || "Invalid code. Please try again.");
                setCode(["", "", "", "", "", ""]);
                inputRefs.current[0]?.focus();
                return;
            }

            await update({ totpEnabled: true });
            toast.success("Two-factor authentication enabled!");
            router.push("/admin");
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setVerifying(false);
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl tracking-tight">
                            Set Up Two-Factor Authentication
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                            Secure your admin account with an authenticator app
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Stepper */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    step === 1
                                        ? "bg-foreground text-background"
                                        : "bg-foreground/10 text-foreground"
                                }`}
                            >
                                1
                            </div>
                            <span
                                className={`text-sm ${
                                    step === 1
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Scan QR
                            </span>
                        </div>
                        <div className="h-px w-8 bg-border" />
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                                    step === 2
                                        ? "bg-foreground text-background"
                                        : "bg-foreground/10 text-muted-foreground"
                                }`}
                            >
                                2
                            </div>
                            <span
                                className={`text-sm ${
                                    step === 2
                                        ? "font-medium text-foreground"
                                        : "text-muted-foreground"
                                }`}
                            >
                                Verify
                            </span>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-4">
                            {setupLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-muted-foreground text-center">
                                        Scan this QR code with your authenticator
                                        app (e.g. Google Authenticator, Authy).
                                    </p>
                                    {qrCodeDataUrl && (
                                        <div className="flex justify-center">
                                            <div className="rounded-lg border border-border/50 bg-white p-3">
                                                <img
                                                    src={qrCodeDataUrl}
                                                    alt="MFA QR Code"
                                                    width={200}
                                                    height={200}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground text-center">
                                            Or enter this secret manually:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 rounded-md bg-muted/50 border border-border/50 px-3 py-2 text-xs font-mono select-all text-center break-all">
                                                {manualSecret}
                                            </code>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="shrink-0 h-9 w-9"
                                                onClick={copySecret}
                                            >
                                                {copied ? (
                                                    <Check className="h-3.5 w-3.5" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            setStep(2);
                                            setTimeout(
                                                () =>
                                                    inputRefs.current[0]?.focus(),
                                                100
                                            );
                                        }}
                                    >
                                        Next
                                    </Button>
                                </>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <form onSubmit={onVerify} className="space-y-6">
                            <p className="text-sm text-muted-foreground text-center">
                                Enter the 6-digit code from your authenticator
                                app to complete setup.
                            </p>
                            <div
                                className="flex justify-center gap-2"
                                onPaste={handlePaste}
                            >
                                {code.map((digit, i) => (
                                    <Input
                                        key={i}
                                        ref={(el) => {
                                            inputRefs.current[i] = el;
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) =>
                                            handleDigitChange(
                                                i,
                                                e.target.value
                                            )
                                        }
                                        onKeyDown={(e) => handleKeyDown(i, e)}
                                        className="w-12 h-12 text-center text-lg font-semibold bg-muted/50 border-border/50"
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        verifying ||
                                        code.join("").length !== 6
                                    }
                                    className="flex-1"
                                >
                                    {verifying && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Verify &amp; Enable
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
