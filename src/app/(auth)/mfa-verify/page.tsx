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
import { Shield, Loader2 } from "lucide-react";

export default function MfaVerifyPage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const [code, setCode] = useState(["", "", "", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const user = session?.user as
        | { role?: string; mfaPending?: boolean }
        | undefined;

    useEffect(() => {
        if (session && !user?.mfaPending) {
            if (user?.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/catalog");
            }
        }
    }, [session, user, router]);

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

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length !== 6) {
            toast.error("Please enter a 6-digit code");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/totp/validate", {
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

            await update({ mfaVerified: true });
            toast.success("Verification successful!");

            if (user?.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/catalog");
            }
        } catch {
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
                <CardHeader className="text-center space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl tracking-tight">
                            Two-Factor Authentication
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                            Enter the 6-digit code from your authenticator app
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
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
                                        handleDigitChange(i, e.target.value)
                                    }
                                    onKeyDown={(e) => handleKeyDown(i, e)}
                                    className="w-12 h-12 text-center text-lg font-semibold bg-muted/50 border-border/50"
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>
                        <Button
                            type="submit"
                            disabled={loading || code.join("").length !== 6}
                            className="w-full"
                        >
                            {loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Verify
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
