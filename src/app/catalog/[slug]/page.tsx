"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
    Download,
    ExternalLink,
    Shield,
    HardDrive,
    Cpu,
    Calendar,
    FileText,
    Loader2,
    Monitor,
    Code,
    Zap,
    Wrench,
    Film,
    Package,
} from "lucide-react";
import type { SoftwareItem, SoftwareVersion } from "@/types";

const categoryIcons: Record<string, React.ElementType> = {
    "operating-system": Monitor,
    development: Code,
    productivity: Zap,
    utility: Wrench,
    multimedia: Film,
    other: Package,
};

const categoryColors: Record<string, string> = {
    "operating-system": "from-blue-500 to-cyan-500",
    development: "from-green-500 to-emerald-500",
    productivity: "from-yellow-500 to-orange-500",
    utility: "from-purple-500 to-pink-500",
    multimedia: "from-red-500 to-rose-500",
    other: "from-gray-500 to-slate-500",
};

function formatBytes(bytes: number) {
    if (!bytes) return "N/A";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function SoftwareDetailPage() {
    const params = useParams();
    const { data: session } = useSession();
    const [software, setSoftware] = useState<SoftwareItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        fetch(`/api/software/${params.slug}`)
            .then((r) => r.json())
            .then((data) => setSoftware(data.software))
            .finally(() => setLoading(false));
    }, [params.slug]);

    async function handleDownload(version: SoftwareVersion) {
        if (!session?.user) {
            toast.error("Please sign in to download");
            return;
        }

        setDownloading(version._id);
        try {
            const res = await fetch(`/api/download/${version._id}`);
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || "Download failed");
                return;
            }

            toast.success("Download starting...");
            window.location.href = data.url;
        } catch {
            toast.error("Download failed");
        } finally {
            setDownloading(null);
        }
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-5 w-2/3 mb-8" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!software) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Software not found</h2>
                <Button asChild variant="outline" className="mt-4 border-white/10">
                    <Link href="/catalog">Back to Catalog</Link>
                </Button>
            </div>
        );
    }

    const Icon = categoryIcons[software.category] || Package;
    const color = categoryColors[software.category] || "from-gray-500 to-slate-500";

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-start gap-5 mb-8">
                <div
                    className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg flex-shrink-0`}
                >
                    <Icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h1 className="text-3xl font-bold">{software.name}</h1>
                        {software.isFeatured && (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                                Featured
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
                        <Badge variant="secondary" className="bg-white/5 border-white/10">
                            {software.category.replace("-", " ")}
                        </Badge>
                        {software.license && (
                            <span className="flex items-center gap-1">
                                <Shield className="h-3.5 w-3.5" />
                                {software.license}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Download className="h-3.5 w-3.5" />
                            {software.totalDownloads.toLocaleString()} downloads
                        </span>
                    </div>
                </div>
            </div>

            {/* Description */}
            {software.description && (
                <Card className="border-white/10 bg-white/[0.03] mb-6">
                    <CardContent className="p-6">
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {software.description}
                        </p>
                        {software.website && (
                            <a
                                href={software.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-blue-400 hover:underline text-sm mt-4"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Visit Project Website
                            </a>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Versions */}
            <h2 className="text-xl font-semibold mb-4">Available Versions</h2>

            {software.versions.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-8 text-center">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No versions available yet</p>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue={software.versions[software.versions.length - 1]?._id} className="space-y-4">
                    <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto p-1">
                        {[...software.versions].reverse().map((v) => (
                            <TabsTrigger
                                key={v._id}
                                value={v._id}
                                className="data-[state=active]:bg-white/10 text-sm"
                            >
                                v{v.versionNumber}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {software.versions.map((version) => (
                        <TabsContent key={version._id} value={version._id}>
                            <Card className="border-white/10 bg-white/[0.03]">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            Version {version.versionNumber}
                                        </CardTitle>
                                        <Button
                                            onClick={() => handleDownload(version)}
                                            disabled={downloading === version._id}
                                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                        >
                                            {downloading === version._id ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="mr-2 h-4 w-4" />
                                            )}
                                            Download
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <HardDrive className="h-4 w-4 flex-shrink-0" />
                                            <span>{formatBytes(version.fileSize)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Monitor className="h-4 w-4 flex-shrink-0" />
                                            <span className="capitalize">{version.platform}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Cpu className="h-4 w-4 flex-shrink-0" />
                                            <span>{version.architecture}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Calendar className="h-4 w-4 flex-shrink-0" />
                                            <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {version.checksum && (
                                        <>
                                            <Separator className="bg-white/10" />
                                            <div className="text-sm">
                                                <span className="text-muted-foreground">SHA256: </span>
                                                <code className="text-xs font-mono bg-white/5 px-2 py-1 rounded break-all">
                                                    {version.checksum}
                                                </code>
                                            </div>
                                        </>
                                    )}

                                    {version.releaseNotes && (
                                        <>
                                            <Separator className="bg-white/10" />
                                            <div>
                                                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                                                    <FileText className="h-4 w-4" />
                                                    Release Notes
                                                </div>
                                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                                    {version.releaseNotes}
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            )}

            {!session?.user && (
                <Card className="mt-6 border-blue-500/20 bg-blue-500/5">
                    <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-sm text-blue-300">
                            Sign in to download this software
                        </p>
                        <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600">
                            <Link href="/login">Sign In</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
