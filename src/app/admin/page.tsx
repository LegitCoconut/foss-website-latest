"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Download, Package, MessageSquare, TrendingUp } from "lucide-react";
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
        { label: "Total Users", value: data.totalUsers, icon: Users, color: "from-blue-500 to-cyan-500" },
        { label: "Downloads Today", value: data.downloadsToday, icon: Download, color: "from-green-500 to-emerald-500" },
        { label: "Total Software", value: data.totalSoftware, icon: Package, color: "from-purple-500 to-pink-500" },
        { label: "Pending Requests", value: data.pendingRequests, icon: MessageSquare, color: "from-orange-500 to-red-500" },
    ];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => (
                    <Card key={s.label} className="border-white/10 bg-white/[0.03]">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div
                                    className={`h-10 w-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}
                                >
                                    <s.icon className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <p className="text-2xl font-bold">{s.value.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Downloads Chart */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        Downloads (Last 30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.downloadsOverTime.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={data.downloadsOverTime}>
                                <defs>
                                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="date"
                                    stroke="rgba(255,255,255,0.3)"
                                    fontSize={12}
                                    tickFormatter={(v) => v.slice(5)}
                                />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "rgba(0,0,0,0.8)",
                                        border: "1px solid rgba(255,255,255,0.1)",
                                        borderRadius: "8px",
                                        fontSize: "12px",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorDownloads)"
                                    strokeWidth={2}
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

            {/* Top Software & Recent Downloads */}
            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardHeader>
                        <CardTitle className="text-lg">Top Software</CardTitle>
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
                                        <span className="text-sm text-muted-foreground">
                                            {sw.downloads} downloads
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/[0.03]">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Downloads</CardTitle>
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
