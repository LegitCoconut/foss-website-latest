"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Download, Package, MessageSquare, TrendingUp, Eye } from "lucide-react";
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

export default function AdminDashboardPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/analytics")
            .then((r) => r.json())
            .then(setData)
            .finally(() => setLoading(false));
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

            {/* Downloads Chart */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Downloads (Last 30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.downloadsOverTime.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
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

            {/* Page Visits by Software */}
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
