"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users, Download, Package, MessageSquare, TrendingUp, Eye,
    Cpu, MemoryStick, HardDrive, Network, Server, Clock, Database,
} from "lucide-react";
import type { AnalyticsData } from "@/types";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

interface SystemStats {
    cpu: { usage: number; cores: number; model: string };
    memory: { total: number; used: number; free: number; usagePercent: number };
    disk: { total: number; used: number; available: number; usagePercent: number };
    storage: { s3: { files: number; assets: number; total: number }; docker: { name: string; size: string }[] };
    network: { interface: string; rxBytes: number; txBytes: number };
    system: { hostname: string; platform: string; arch: string; uptime: number };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function UsageBar({ percent, color }: { percent: number; color?: string }) {
    const barColor = percent > 90 ? "bg-red-500" : percent > 70 ? "bg-yellow-500" : (color || "bg-foreground/40");
    return (
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
    );
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [sysStats, setSysStats] = useState<SystemStats | null>(null);

    useEffect(() => {
        fetch("/api/analytics")
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));

        // Fetch system stats
        fetch("/api/admin/system-stats")
            .then((r) => r.json())
            .then(setSysStats)
            .catch(() => {});

        // Auto-refresh system stats every 10 seconds
        const interval = setInterval(() => {
            fetch("/api/admin/system-stats")
                .then((r) => r.json())
                .then(setSysStats)
                .catch(() => {});
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-28" />
                    ))}
                </div>
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (!data) return null;

    const stats = [
        { label: "Total Users", value: data.totalUsers, icon: Users },
        { label: "Downloads Today", value: data.downloadsToday, icon: Download },
        { label: "Total Software", value: data.totalSoftware, icon: Package },
        { label: "Pending Requests", value: data.pendingRequests, icon: MessageSquare },
    ];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Card key={s.label} className="border-border/50">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                    <s.icon className="h-4 w-4 text-foreground/60" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold tabular-nums">{s.value.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* System Resources */}
            {!sysStats && (
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-28" />
                        ))}
                    </div>
                </div>
            )}
            {sysStats && (
                <>
                    <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                        <Server className="h-4 w-4 text-muted-foreground" />
                        System Resources
                    </h2>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* CPU */}
                        <Card className="border-border/50">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                        <Cpu className="h-4 w-4 text-foreground/60" />
                                    </div>
                                    <span className="text-2xl font-bold tabular-nums">{sysStats.cpu.usage}%</span>
                                </div>
                                <UsageBar percent={sysStats.cpu.usage} />
                                <div>
                                    <p className="text-xs text-muted-foreground">CPU Usage</p>
                                    <p className="text-[11px] text-muted-foreground/70 truncate">{sysStats.cpu.cores} cores</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Memory */}
                        <Card className="border-border/50">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                        <MemoryStick className="h-4 w-4 text-foreground/60" />
                                    </div>
                                    <span className="text-2xl font-bold tabular-nums">{sysStats.memory.usagePercent}%</span>
                                </div>
                                <UsageBar percent={sysStats.memory.usagePercent} />
                                <div>
                                    <p className="text-xs text-muted-foreground">Memory Usage</p>
                                    <p className="text-[11px] text-muted-foreground/70">{formatBytes(sysStats.memory.used)} / {formatBytes(sysStats.memory.total)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Disk */}
                        <Card className="border-border/50">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                        <HardDrive className="h-4 w-4 text-foreground/60" />
                                    </div>
                                    <span className="text-2xl font-bold tabular-nums">{sysStats.disk.usagePercent}%</span>
                                </div>
                                <UsageBar percent={sysStats.disk.usagePercent} />
                                <div>
                                    <p className="text-xs text-muted-foreground">Disk Usage</p>
                                    <p className="text-[11px] text-muted-foreground/70">{formatBytes(sysStats.disk.used)} / {formatBytes(sysStats.disk.total)}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Network */}
                        <Card className="border-border/50">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-9 w-9 rounded-lg bg-foreground/[0.08] border border-border/50 flex items-center justify-center">
                                        <Network className="h-4 w-4 text-foreground/60" />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">{sysStats.network.interface}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-sm font-semibold tabular-nums">{formatBytes(sysStats.network.rxBytes)}</p>
                                        <p className="text-[11px] text-muted-foreground">Received</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold tabular-nums">{formatBytes(sysStats.network.txBytes)}</p>
                                        <p className="text-[11px] text-muted-foreground">Sent</p>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Network I/O</p>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {/* Downloads Chart & Page Visits side by side */}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            Downloads (Last 30 Days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.downloadsOverTime.length > 0 ? (
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={data.downloadsOverTime}>
                                    <defs>
                                        <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--foreground))" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="hsl(var(--foreground))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="hsl(var(--muted-foreground))"
                                        fontSize={12}
                                        tickFormatter={(v) => v.slice(5)}
                                    />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--popover))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            fontSize: "12px",
                                            color: "hsl(var(--foreground))",
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="hsl(var(--foreground))"
                                        fillOpacity={1}
                                        fill="url(#colorDownloads)"
                                        strokeWidth={1.5}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                                No download data yet
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            Page Visits by Software
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!data.softwarePageVisits || data.softwarePageVisits.length === 0 ? (
                            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                                No page visit data yet
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {data.softwarePageVisits.map((sw, i) => {
                                    const maxVisits = data.softwarePageVisits[0].visits;
                                    const barWidth = maxVisits > 0 ? (sw.visits / maxVisits) * 100 : 0;
                                    return (
                                        <div key={sw.slug} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-mono text-muted-foreground w-5">
                                                        {i + 1}.
                                                    </span>
                                                    <span className="text-sm font-medium">{sw.name}</span>
                                                </div>
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {sw.visits.toLocaleString()} visit{sw.visits !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="ml-8 h-1.5 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-foreground/20"
                                                    style={{ width: `${barWidth}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Storage & System Info */}
            {sysStats && (
                <div className="grid lg:grid-cols-2 gap-4">
                    {/* Garage / Docker Storage */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                Storage Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">S3 Total</span>
                                <span className="font-mono font-medium">{formatBytes(sysStats.storage.s3.total)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">S3 Files Bucket</span>
                                <span className="font-mono font-medium">{formatBytes(sysStats.storage.s3.files)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">S3 Assets Bucket</span>
                                <span className="font-mono font-medium">{formatBytes(sysStats.storage.s3.assets)}</span>
                            </div>
                            {sysStats.storage.docker.map((d) => (
                                <div key={d.name} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Docker {d.name}</span>
                                    <span className="font-mono font-medium">{d.size}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* System Info */}
                    <Card className="border-border/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Server className="h-4 w-4 text-muted-foreground" />
                                System Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Hostname</span>
                                <span className="font-mono font-medium">{sysStats.system.hostname}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Platform</span>
                                <span className="font-mono font-medium">{sysStats.system.platform} / {sysStats.system.arch}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">CPU</span>
                                <span className="font-mono font-medium text-xs truncate max-w-[200px]">{sysStats.cpu.model}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Uptime</span>
                                <span className="font-mono font-medium">{formatUptime(sysStats.system.uptime)}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Top Software & Recent Downloads */}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Top Software</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.topSoftware.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No download data</p>
                        ) : (
                            <div className="space-y-3">
                                {data.topSoftware.map((sw, i) => (
                                    <div key={sw.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-muted-foreground w-5">
                                                {i + 1}.
                                            </span>
                                            <span className="text-sm font-medium">{sw.name}</span>
                                        </div>
                                        <span className="text-sm text-muted-foreground tabular-nums">
                                            {sw.downloads}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-border/50">
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Recent Downloads</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {data.recentDownloads.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No downloads yet</p>
                        ) : (
                            <div className="space-y-3">
                                {data.recentDownloads.map((dl, i) => (
                                    <div key={i} className="flex items-center justify-between text-sm">
                                        <div>
                                            <span className="font-medium">{dl.softwareName}</span>
                                            <span className="text-muted-foreground"> v{dl.versionNumber}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {dl.userName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
