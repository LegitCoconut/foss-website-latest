"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Eye, BarChart3 } from "lucide-react";
import { useTheme } from "next-themes";
import type { AnalyticsData } from "@/types";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    BarChart,
    Bar,
} from "recharts";

export default function AdminAnalyticsPage() {
    const { resolvedTheme } = useTheme();
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
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
            </div>
        );
    }

    if (!data) return null;

    const tooltipStyle = {
        backgroundColor: "hsl(var(--popover))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        fontSize: "12px",
        color: "hsl(var(--foreground))",
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-border/50">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads Today</p>
                        <p className="text-3xl font-bold mt-1 tabular-nums">{data.downloadsToday}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads This Week</p>
                        <p className="text-3xl font-bold mt-1 tabular-nums">{data.downloadsThisWeek}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/50">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads This Month</p>
                        <p className="text-3xl font-bold mt-1 tabular-nums">{data.downloadsThisMonth}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Downloads Chart */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        Downloads Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.downloadsOverTime.length > 0 ? (
                        <ResponsiveContainer key={`dl-${resolvedTheme}`} width="100%" height={350}>
                            <AreaChart data={data.downloadsOverTime}>
                                <defs>
                                    <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4ade80" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Area type="monotone" dataKey="count" stroke="#4ade80" fillOpacity={1} fill="url(#dlGrad)" strokeWidth={1.5} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                </CardContent>
            </Card>

            {/* Page Visits Chart */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        Page Visits Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.pageVisitsOverTime.length > 0 ? (
                        <ResponsiveContainer key={`pv-${resolvedTheme}`} width="100%" height={300}>
                            <BarChart data={data.pageVisitsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                <Tooltip contentStyle={tooltipStyle} />
                                <Bar dataKey="count" fill="#4ade80" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                </CardContent>
            </Card>

            {/* Top Software */}
            <Card className="border-border/50">
                <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        Top Downloaded Software
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.topSoftware.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                    ) : (
                        <div className="space-y-3">
                            {data.topSoftware.map((sw, i) => (
                                <div key={sw.name} className="flex items-center gap-4">
                                    <span className="text-sm font-mono text-muted-foreground w-6">#{i + 1}</span>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium">{sw.name}</span>
                                            <span className="text-sm text-muted-foreground tabular-nums">{sw.downloads}</span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-green-400/50 rounded-full"
                                                style={{
                                                    width: `${(sw.downloads / (data.topSoftware[0]?.downloads || 1)) * 100}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
