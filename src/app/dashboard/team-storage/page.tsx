"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { FolderArchive, Users, Files, HardDrive, ArrowRight, Upload, Shield, Eye } from "lucide-react";
import type { TeamItem } from "@/types";

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export default function TeamStoragePage() {
    const [teams, setTeams] = useState<TeamItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/team-storage")
            .then((r) => r.json())
            .then((data) => setTeams(data.teams || []))
            .catch(() => toast.error("Failed to load teams"))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-44" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Team Storage</h1>

            {teams.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-16 text-center">
                        <FolderArchive className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                        <h2 className="text-base font-semibold mb-1">No Team Storage</h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            You are not part of any team storage yet. Contact your admin to get added to a team.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map((team) => {
                        const pct = team.storageLimit > 0 ? Math.min((team.totalStorageUsed / team.storageLimit) * 100, 100) : 0;
                        return (
                            <Link key={team._id} href={`/dashboard/team-storage/${team._id}`}>
                                <Card className="group border-border/50 hover:bg-muted/50 transition-all duration-200 cursor-pointer h-full">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                                    <FolderArchive className="h-5 w-5 text-foreground/60" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{team.name}</h3>
                                                    {team.description && (
                                                        <p className="text-xs text-muted-foreground line-clamp-1">{team.description}</p>
                                                    )}
                                                    {team.status === "suspended" && (
                                                        <Badge className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20 mt-0.5">
                                                            Suspended
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            )}
            {/* Info box */}
            <Card className="border-border/50 bg-muted/30">
                <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center flex-shrink-0">
                            <FolderArchive className="h-4 w-4 text-foreground/60" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold mb-1.5">About Team Storage</h3>
                            <div className="space-y-2 text-xs text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <Upload className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>Upload and share files with your team members. Multiple files can be uploaded at once with real-time progress tracking.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Eye className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>All team members can view and download files. You can only delete files you uploaded yourself.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                    <span>Each team has a shared storage limit set by your admin. Uploads are blocked once the limit is reached.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
