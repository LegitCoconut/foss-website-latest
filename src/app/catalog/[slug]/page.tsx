"use client";

import { useEffect, useState, useRef } from "react";
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
import Image from "next/image";
import {
    ChevronLeft,
    ChevronRight,
    X,
    ArrowLeft,
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
    Github,
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

function ScreenshotGallery({ name, keys }: { name: string; keys: string[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    function updateScrollState() {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 0);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
    }

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => { el.removeEventListener("scroll", updateScrollState); ro.disconnect(); };
    }, []);

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (lightboxIndex === null) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") setLightboxIndex(null);
            if (e.key === "ArrowLeft") setLightboxIndex((prev) => prev !== null && prev > 0 ? prev - 1 : prev);
            if (e.key === "ArrowRight") setLightboxIndex((prev) => prev !== null && prev < keys.length - 1 ? prev + 1 : prev);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightboxIndex, keys.length]);

    function scroll(dir: "left" | "right") {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
    }

    return (
        <>
            <div className="relative mb-6 group">
                <div
                    ref={scrollRef}
                    className="flex gap-3 overflow-x-auto"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {keys.map((key, i) => (
                        <Image
                            key={key}
                            src={`/api/assets/${key}`}
                            alt={`${name} screenshot ${i + 1}`}
                            width={600}
                            height={340}
                            className="rounded-lg border border-white/10 object-cover h-52 w-auto flex-shrink-0 cursor-pointer hover:brightness-90 transition"
                            unoptimized
                            onClick={() => setLightboxIndex(i)}
                        />
                    ))}
                </div>
                {canScrollLeft && (
                    <button
                        onClick={() => scroll("left")}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-opacity opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                )}
                {canScrollRight && (
                    <button
                        onClick={() => scroll("right")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/70 border border-white/10 flex items-center justify-center text-white hover:bg-black/90 transition-opacity opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Lightbox */}
            {lightboxIndex !== null && (
                <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                    onClick={() => setLightboxIndex(null)}
                >
                    {/* Close + Counter */}
                    <div className="absolute top-4 right-4 flex items-center gap-3">
                        <span className="text-white/60 text-sm font-mono">{lightboxIndex + 1} / {keys.length}</span>
                        <button
                            onClick={() => setLightboxIndex(null)}
                            className="h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Previous */}
                    {lightboxIndex > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}

                    {/* Image */}
                    <Image
                        src={`/api/assets/${keys[lightboxIndex]}`}
                        alt={`${name} screenshot ${lightboxIndex + 1}`}
                        width={1200}
                        height={800}
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
                        unoptimized
                        onClick={(e) => e.stopPropagation()}
                    />

                    {/* Next */}
                    {lightboxIndex < keys.length - 1 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}
                </div>
            )}
        </>
    );
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

    async function handleDownload(versionId: string, fileId?: string) {
        if (!session?.user) {
            toast.error("Please sign in to download");
            return;
        }

        setDownloading(fileId || versionId);
        try {
            const url = fileId
                ? `/api/download/${versionId}?fileId=${fileId}`
                : `/api/download/${versionId}`;
            const res = await fetch(url);
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

    const activeVersions = software.versions.filter((v) => !v.isDeleted);
    const defaultVersion = software.defaultVersionId
        ? activeVersions.find((v) => v._id === software.defaultVersionId)
        : null;
    // Fall back to latest version if no default is set
    const featuredVersion = defaultVersion || activeVersions[activeVersions.length - 1] || null;
    const otherVersions = activeVersions.filter((v) => v._id !== featuredVersion?._id);

    const platformLabels: Record<string, string> = {
        windows: "Windows",
        linux: "Linux",
        macos: "macOS (Intel)",
        "macos-arm": "macOS (Apple Silicon)",
        "cross-platform": "Cross-platform",
        android: "Android (APK)",
    };

    function VersionCard({ version, prominent }: { version: SoftwareVersion; prominent?: boolean }) {
        const hasFiles = version.files && version.files.length > 0;
        const isLegacy = !hasFiles && version.fileKey;

        return (
            <Card className="border-white/10 bg-white/[0.03]">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">
                                Version {version.versionNumber}
                                {prominent && defaultVersion && (
                                    <Badge className="ml-2 bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-[10px]">
                                        Recommended
                                    </Badge>
                                )}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(version.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {/* Single download button for legacy or single-file versions */}
                        {(isLegacy || (hasFiles && version.files.length === 1)) && (
                            <Button
                                onClick={() => handleDownload(version._id, hasFiles ? version.files[0]._id : undefined)}
                                disabled={downloading === version._id || downloading === version.files?.[0]?._id}
                                className={prominent
                                    ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                    : ""}
                                variant={prominent ? "default" : "outline"}
                            >
                                {(downloading === version._id || downloading === version.files?.[0]?._id) ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                Download
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Multi-file download list */}
                    {hasFiles && version.files.length > 1 && (
                        <div className="space-y-2">
                            {version.files.map((f) => (
                                <div key={f._id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{f.fileName}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10">
                                                    {platformLabels[f.platform] || f.platform}
                                                </Badge>
                                                <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10">
                                                    {f.architecture}
                                                </Badge>
                                                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                    <HardDrive className="h-3 w-3" />
                                                    {formatBytes(f.fileSize)}
                                                </span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleDownload(version._id, f._id)}
                                            disabled={downloading === f._id}
                                            className={prominent
                                                ? "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                                : ""}
                                            variant={prominent ? "default" : "outline"}
                                        >
                                            {downloading === f._id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Download className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    {f.checksum && (
                                        <div className="mt-2 text-[11px] text-muted-foreground">
                                            <span>SHA256: </span>
                                            <code className="font-mono bg-white/5 px-1.5 py-0.5 rounded break-all select-all">
                                                {f.checksum}
                                            </code>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Single-file/legacy metadata */}
                    {(isLegacy || (hasFiles && version.files.length === 1)) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <HardDrive className="h-4 w-4 flex-shrink-0" />
                                <span>{formatBytes(hasFiles ? version.files[0].fileSize : version.fileSize)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Monitor className="h-4 w-4 flex-shrink-0" />
                                <span>{platformLabels[hasFiles ? version.files[0].platform : version.platform] || (hasFiles ? version.files[0].platform : version.platform)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Cpu className="h-4 w-4 flex-shrink-0" />
                                <span>{hasFiles ? version.files[0].architecture : version.architecture}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4 flex-shrink-0" />
                                <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Checksum for single file */}
                    {isLegacy && version.checksum && (
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
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Back */}
            <Link href="/catalog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
                <ArrowLeft className="h-4 w-4" />
                Back to Catalog
            </Link>

            {/* Header */}
            <div className="flex items-start gap-5 mb-8">
                {software.iconKey ? (
                    <Image
                        src={`/api/assets/${software.iconKey}`}
                        alt={software.name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-2xl object-cover shadow-lg flex-shrink-0 border border-white/10"
                        unoptimized
                    />
                ) : (
                    <div
                        className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg flex-shrink-0`}
                    >
                        <Icon className="h-8 w-8 text-white" />
                    </div>
                )}
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

            {/* Screenshots */}
            {software.screenshotKeys && software.screenshotKeys.length > 0 && (
                <ScreenshotGallery name={software.name} keys={software.screenshotKeys} />
            )}

            {/* Description & Links */}
            {(software.description || software.website || software.githubUrl) && (
                <Card className="border-white/10 bg-white/[0.03] mb-6">
                    <CardContent className="p-6">
                        {software.description && (
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {software.description}
                            </p>
                        )}
                        {(software.website || software.githubUrl) && (
                            <div className="flex items-center gap-4 mt-4">
                                {software.website && (
                                    <a
                                        href={software.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-blue-400 hover:underline text-sm"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Website
                                    </a>
                                )}
                                {software.githubUrl && (
                                    <a
                                        href={software.githubUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-blue-400 hover:underline text-sm"
                                    >
                                        <Github className="h-3.5 w-3.5" />
                                        GitHub
                                    </a>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Default / Featured Version */}
            {featuredVersion ? (
                <>
                    <h2 className="text-xl font-semibold mb-4">Download</h2>
                    <VersionCard version={featuredVersion} prominent />
                </>
            ) : (
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-8 text-center">
                        <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No versions available yet</p>
                    </CardContent>
                </Card>
            )}

            {/* Other Versions */}
            {otherVersions.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-xl font-semibold mb-4">Other Versions</h2>
                    <Tabs defaultValue={otherVersions[otherVersions.length - 1]?._id} className="space-y-4">
                        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto p-1">
                            {[...otherVersions].reverse().map((v) => (
                                <TabsTrigger
                                    key={v._id}
                                    value={v._id}
                                    className="data-[state=active]:bg-white/10 text-sm"
                                >
                                    v{v.versionNumber}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {otherVersions.map((version) => (
                            <TabsContent key={version._id} value={version._id}>
                                <VersionCard version={version} />
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
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
