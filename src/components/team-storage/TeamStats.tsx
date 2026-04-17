"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Users, Files, HardDrive } from "lucide-react";
import type { TeamItem } from "@/types";
import { formatBytes } from "./utils";

interface TeamStatsProps {
    team: TeamItem;
}

export function TeamStats({ team }: TeamStatsProps) {
    const pct = team.storageLimit > 0
        ? Math.min((team.totalStorageUsed / team.storageLimit) * 100, 100)
        : 0;
    const remainingStorage = Math.max(team.storageLimit - team.totalStorageUsed, 0);

    return (
        <Card className="border-border/50">
            <CardContent className="p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-5">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                <Users className="h-4 w-4 text-foreground/60" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tabular-nums leading-none">{team.memberCount}</p>
                                <p className="text-[11px] text-muted-foreground">Members</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-border/50 hidden md:block" />
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                <Files className="h-4 w-4 text-foreground/60" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tabular-nums leading-none">{team.fileCount}</p>
                                <p className="text-[11px] text-muted-foreground">Files</p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-border/50 hidden md:block" />
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                <HardDrive className="h-4 w-4 text-foreground/60" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tabular-nums leading-none">{formatBytes(team.totalStorageUsed)}</p>
                                <p className="text-[11px] text-muted-foreground">of {formatBytes(team.storageLimit)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="md:w-48 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{pct.toFixed(0)}% used</span>
                            <span>{formatBytes(remainingStorage)} free</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-400/60"}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
