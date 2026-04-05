"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    // If already logged in, redirect based on role
    useEffect(() => {
        if (session?.user) {
            const role = (session.user as { role?: string }).role;
            if (role === "admin") {
                window.location.href = "/admin";
            } else {
                window.location.href = "/catalog";
            }
        }
    }, [session]);

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
                toast.error("Invalid email or password");
            } else {
                toast.success("Welcome back!");
                // Fetch session to determine role
                const res = await fetch("/api/auth/session");
                const data = await res.json();
                if (data?.user?.mfaPending) {
                    router.push("/mfa-verify");
                    return;
                }
                const role = data?.user?.role;
                if (role === "admin") {
                    window.location.href = "/admin";
                } else {
                    window.location.href = "/catalog";
                }
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
                        <LogIn className="h-5 w-5 text-foreground/70" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl tracking-tight">Welcome Back</CardTitle>
                        <CardDescription className="mt-1.5">
                            Sign in to your FOSS Hub account
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
                                placeholder="you@example.com"
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
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        Don&apos;t have an account?{" "}
                        <Link href="/register" className="text-foreground font-medium hover:underline">
                            Create one
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
