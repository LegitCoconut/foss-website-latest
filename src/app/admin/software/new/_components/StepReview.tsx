"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import type { BasicInfoData } from "./StepBasicInfo";
import type { MediaData } from "./StepMedia";
import type { VersionData } from "./StepVersion";

interface StepReviewProps {
    basicInfo: BasicInfoData;
    media: MediaData;
    version: VersionData;
    hasVersion: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
    "operating-system": "Operating System",
    development: "Development",
    productivity: "Productivity",
    utility: "Utility",
    multimedia: "Multimedia",
    other: "Other",
};

export default function StepReview({ basicInfo, media, version, hasVersion }: StepReviewProps) {
    const logoSrc = media.logoPreview || (media.existingLogoKey ? `/api/assets/${media.existingLogoKey}` : null);

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Review all the information before publishing.
            </p>

            {/* Basic Info */}
            <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</h3>
                    <div className="flex items-start gap-4">
                        {logoSrc && (
                            <div className="relative h-14 w-14 rounded-lg border border-border/50 overflow-hidden shrink-0">
                                <Image src={logoSrc} alt="Logo" fill className="object-cover" unoptimized />
                            </div>
                        )}
                        <div className="space-y-1 min-w-0">
                            <h2 className="text-lg font-bold">{basicInfo.name || "Untitled"}</h2>
                            {basicInfo.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{basicInfo.description}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{CATEGORY_LABELS[basicInfo.category] || basicInfo.category}</Badge>
                        {basicInfo.license && <Badge variant="outline">{basicInfo.license}</Badge>}
                        {basicInfo.isFeatured && <Badge>Featured</Badge>}
                    </div>
                    {(basicInfo.website || basicInfo.githubUrl) && (
                        <div className="text-sm text-muted-foreground space-y-1">
                            {basicInfo.website && <p>Website: {basicInfo.website}</p>}
                            {basicInfo.githubUrl && <p>GitHub: {basicInfo.githubUrl}</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Media */}
            <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Media</h3>
                    {!logoSrc && media.existingScreenshotKeys.length === 0 && media.screenshotPreviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No media uploaded</p>
                    ) : (
                        <>
                            {(media.existingScreenshotKeys.length > 0 || media.screenshotPreviews.length > 0) && (
                                <div className="grid grid-cols-4 gap-2">
                                    {media.existingScreenshotKeys.map((key, idx) => (
                                        <div key={key} className="relative aspect-video rounded border border-border/50 overflow-hidden">
                                            <Image src={`/api/assets/${key}`} alt={`Screenshot ${idx + 1}`} fill className="object-cover" unoptimized />
                                        </div>
                                    ))}
                                    {media.screenshotPreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-video rounded border border-border/50 overflow-hidden">
                                            <Image src={src} alt={`Screenshot ${idx + 1}`} fill className="object-cover" unoptimized />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Version */}
            <Card className="border-border/50">
                <CardContent className="p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Version</h3>
                    {hasVersion ? (
                        <div className="text-sm space-y-2">
                            <p><span className="text-muted-foreground">Version:</span> {version.versionNumber}</p>
                            {version.releaseNotes && (
                                <p><span className="text-muted-foreground">Release Notes:</span> {version.releaseNotes}</p>
                            )}
                            {version.files && version.files.length > 0 ? (
                                <div className="space-y-1.5 mt-2">
                                    <p className="text-muted-foreground text-xs">{version.files.length} file{version.files.length > 1 ? "s" : ""}:</p>
                                    {version.files.filter(f => f.file).map((f, i) => (
                                        <div key={i} className="text-xs flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5">
                                            <span className="font-medium truncate">{f.file!.name}</span>
                                            <span className="text-muted-foreground capitalize">{f.platform}</span>
                                            <span className="text-muted-foreground">{f.architecture}</span>
                                            <span className="text-muted-foreground ml-auto">{(f.file!.size / (1024 * 1024)).toFixed(2)} MB</span>
                                        </div>
                                    ))}
                                </div>
                            ) : version.file && (
                                <p><span className="text-muted-foreground">File:</span> {version.file.name} ({(version.file.size / (1024 * 1024)).toFixed(2)} MB)</p>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No version added (skipped)</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
