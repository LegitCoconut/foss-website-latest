"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Invalid credentials");
            } else {
                // Verify the user is actually an admin
                const session = await fetch("/api/auth/session");
                const data = await session.json();
                if (data?.user?.role !== "admin") {
                    toast.error("Access denied. Admin credentials required.");
                    // Sign them out since they're not an admin
                    await fetch("/api/auth/signout", { method: "POST" });
                    setLoading(false);
                    return;
                }
                if (data?.user?.mfaPending) {
                    router.push("/mfa-verify");
                    return;
                }
                toast.success("Welcome back, Admin");
                window.location.href = "/admin";
            }
        } catch {
            toast.error("Something went wrong");
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
                        <CardTitle className="text-2xl tracking-tight">Admin Portal</CardTitle>
                        <CardDescription className="mt-1.5">
                            Sign in with your administrator credentials
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="admin@example.com"
                                required
                                className="bg-muted/50 border-border/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                required
                                className="bg-muted/50 border-border/50"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sign In
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
