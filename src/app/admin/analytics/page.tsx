"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Eye } from "lucide-react";
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

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold">Analytics</h1>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads Today</p>
                        <p className="text-3xl font-bold mt-1">{data.downloadsToday}</p>
                    </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads This Week</p>
                        <p className="text-3xl font-bold mt-1">{data.downloadsThisWeek}</p>
                    </CardContent>
                </Card>
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-5">
                        <p className="text-sm text-muted-foreground">Downloads This Month</p>
                        <p className="text-3xl font-bold mt-1">{data.downloadsThisMonth}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Downloads Chart */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        Downloads Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.downloadsOverTime.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={data.downloadsOverTime}>
                                <defs>
                                    <linearGradient id="dlGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#dlGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                </CardContent>
            </Card>

            {/* Page Visits Chart */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="h-5 w-5 text-purple-400" />
                        Page Visits Over Time
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.pageVisitsOverTime.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data.pageVisitsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
                                />
                                <Bar dataKey="count" fill="#a855f7" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data</div>
                    )}
                </CardContent>
            </Card>

            {/* Top Software */}
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-green-400" />
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
                                            <span className="text-sm text-muted-foreground">{sw.downloads}</span>
                                        </div>
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
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
