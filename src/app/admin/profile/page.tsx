"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    User,
    Mail,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Calendar,
    ArrowRight,
} from "lucide-react";

export default function AdminProfilePage() {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return (
            <div className="p-6 max-w-2xl space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64" />
            </div>
        );
    }

    const user = session?.user;
    if (!user) return null;

    const totpEnabled = (user as any).totpEnabled;

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
                        <div className="flex-1 space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">{user.name}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                                        <Shield className="h-3 w-3 mr-1" />
                                        Admin
                                    </Badge>
                                </div>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span>{user.email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <User className="h-4 w-4" />
                                    <span>ID: {user.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Security */}
            <Card className="border-border/50">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Security</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
                        <div className="flex items-center gap-3">
                            {totpEnabled ? (
                                <div className="h-10 w-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                                    <ShieldCheck className="h-5 w-5 text-green-500" />
                                </div>
                            ) : (
                                <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                                    <ShieldAlert className="h-5 w-5 text-red-500" />
                                </div>
                            )}
                            <div>
                                <p className="text-sm font-medium">Two-Factor Authentication</p>
                                {totpEnabled ? (
                                    <p className="text-xs text-green-400">Active — your account is protected</p>
                                ) : (
                                    <p className="text-xs text-red-500">Not set up — required for admin accounts</p>
                                )}
                            </div>
                        </div>
                        <Button asChild variant={totpEnabled ? "outline" : "default"} size="sm">
                            <Link href="/admin/mfa-setup">
                                {totpEnabled ? "Reconfigure" : "Set Up Now"}
                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
