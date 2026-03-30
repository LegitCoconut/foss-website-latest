"use client";

import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";
import Image from "next/image";

export interface MediaData {
    logoFile: File | null;
    logoPreview: string | null;
    existingLogoKey: string;
    screenshotFiles: File[];
    screenshotPreviews: string[];
    existingScreenshotKeys: string[];
}

interface StepMediaProps {
    data: MediaData;
    onChange: (data: MediaData) => void;
}

export default function StepMedia({ data, onChange }: StepMediaProps) {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const screenshotInputRef = useRef<HTMLInputElement>(null);

    function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) return;
        onChange({
            ...data,
            logoFile: file,
            logoPreview: URL.createObjectURL(file),
            existingLogoKey: "",
        });
    }

    function clearLogo() {
        onChange({
            ...data,
            logoFile: null,
            logoPreview: null,
            existingLogoKey: "",
        });
        if (logoInputRef.current) logoInputRef.current.value = "";
    }

    function handleScreenshotSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter((f) => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;
        onChange({
            ...data,
            screenshotFiles: [...data.screenshotFiles, ...imageFiles],
            screenshotPreviews: [
                ...data.screenshotPreviews,
                ...imageFiles.map((f) => URL.createObjectURL(f)),
            ],
        });
        if (screenshotInputRef.current) screenshotInputRef.current.value = "";
    }

    function removeNewScreenshot(idx: number) {
        onChange({
            ...data,
            screenshotFiles: data.screenshotFiles.filter((_, i) => i !== idx),
            screenshotPreviews: data.screenshotPreviews.filter((_, i) => i !== idx),
        });
    }

    function removeExistingScreenshot(idx: number) {
        onChange({
            ...data,
            existingScreenshotKeys: data.existingScreenshotKeys.filter((_, i) => i !== idx),
        });
    }

    const logoSrc = data.logoPreview || (data.existingLogoKey ? `/api/assets/${data.existingLogoKey}` : null);

    return (
        <div className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                    {logoSrc ? (
                        <div className="relative h-20 w-20 rounded-lg border border-border/50 overflow-hidden">
                            <Image src={logoSrc} alt="Logo preview" fill className="object-cover" unoptimized />
                            <button
                                type="button"
                                onClick={clearLogo}
                                className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="h-20 w-20 rounded-lg border-2 border-dashed border-border/50 flex items-center justify-center hover:border-foreground/30 transition-colors"
                        >
                            <Upload className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                    <div className="text-sm text-muted-foreground">
                        {data.logoFile ? data.logoFile.name : data.existingLogoKey ? "Current logo" : "Click to upload a logo"}
                    </div>
                    <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                    />
                </div>
            </div>

            {/* Screenshots */}
            <div className="space-y-2">
                <Label>Screenshots</Label>
                <div className="grid grid-cols-3 gap-3">
                    {/* Existing screenshots from server */}
                    {data.existingScreenshotKeys.map((key, idx) => (
                        <div key={`existing-${key}`} className="relative aspect-video rounded-lg border border-border/50 overflow-hidden">
                            <Image src={`/api/assets/${key}`} alt={`Screenshot ${idx + 1}`} fill className="object-cover" unoptimized />
                            <button
                                type="button"
                                onClick={() => removeExistingScreenshot(idx)}
                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {/* New screenshot previews */}
                    {data.screenshotPreviews.map((src, idx) => (
                        <div key={`new-${idx}`} className="relative aspect-video rounded-lg border border-border/50 overflow-hidden">
                            <Image src={src} alt={`Screenshot ${idx + 1}`} fill className="object-cover" unoptimized />
                            <button
                                type="button"
                                onClick={() => removeNewScreenshot(idx)}
                                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}
                    {/* Add button */}
                    <button
                        type="button"
                        onClick={() => screenshotInputRef.current?.click()}
                        className="aspect-video rounded-lg border-2 border-dashed border-border/50 flex flex-col items-center justify-center hover:border-foreground/30 transition-colors gap-1"
                    >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Add</span>
                    </button>
                </div>
                <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotSelect}
                    className="hidden"
                />
            </div>
        </div>
    );
}
