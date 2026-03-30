"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Save, ArrowRight, SkipForward, Send } from "lucide-react";

import Stepper from "./_components/Stepper";
import StepBasicInfo, { type BasicInfoData } from "./_components/StepBasicInfo";
import StepMedia, { type MediaData } from "./_components/StepMedia";
import StepVersion, { type VersionData, type UploadStats } from "./_components/StepVersion";
import StepReview from "./_components/StepReview";

const INITIAL_BASIC_INFO: BasicInfoData = {
    name: "",
    description: "",
    category: "other",
    license: "",
    website: "",
    githubUrl: "",
    isFeatured: false,
};

const INITIAL_MEDIA: MediaData = {
    logoFile: null,
    logoPreview: null,
    existingLogoKey: "",
    screenshotFiles: [],
    screenshotPreviews: [],
    existingScreenshotKeys: [],
};

const INITIAL_VERSION: VersionData = {
    versionNumber: "",
    releaseNotes: "",
    platform: "cross-platform",
    architecture: "x86_64",
    file: null,
};

export default function NewSoftwarePageWrapper() {
    return (
        <Suspense fallback={
            <div className="p-6 max-w-3xl flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <NewSoftwarePage />
        </Suspense>
    );
}

function NewSoftwarePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const draftId = searchParams.get("draft");

    const [currentStep, setCurrentStep] = useState(1);
    const [completedSteps, setCompletedSteps] = useState(0);
    const [softwareId, setSoftwareId] = useState<string | null>(draftId);
    const [loading, setLoading] = useState(false);
    const [loadingDraft, setLoadingDraft] = useState(!!draftId);
    const [hasVersion, setHasVersion] = useState(false);

    const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);

    const [basicInfo, setBasicInfo] = useState<BasicInfoData>(INITIAL_BASIC_INFO);
    const [media, setMedia] = useState<MediaData>(INITIAL_MEDIA);
    const [version, setVersion] = useState<VersionData>(INITIAL_VERSION);

    // Load draft data
    const loadDraft = useCallback(async (id: string) => {
        try {
            setLoadingDraft(true);
            const res = await fetch(`/api/software/${id}`);
            if (!res.ok) {
                toast.error("Failed to load draft");
                router.push("/admin/software");
                return;
            }
            const { software } = await res.json();

            setBasicInfo({
                name: software.name || "",
                description: software.description || "",
                category: software.category || "other",
                license: software.license || "",
                website: software.website || "",
                githubUrl: software.githubUrl || "",
                isFeatured: software.isFeatured || false,
            });

            setMedia((prev) => ({
                ...prev,
                existingLogoKey: software.iconKey || "",
                existingScreenshotKeys: software.screenshotKeys || [],
            }));

            if (software.versions?.length > 0) {
                const v = software.versions[0];
                setVersion({
                    versionNumber: v.versionNumber || "",
                    releaseNotes: v.releaseNotes || "",
                    platform: v.platform || "cross-platform",
                    architecture: v.architecture || "x86_64",
                    file: null,
                });
                setHasVersion(true);
            }

            setCompletedSteps(software.completedSteps || 0);
            setSoftwareId(id);
        } catch {
            toast.error("Failed to load draft");
            router.push("/admin/software");
        } finally {
            setLoadingDraft(false);
        }
    }, [router]);

    useEffect(() => {
        if (draftId) {
            loadDraft(draftId);
        }
    }, [draftId, loadDraft]);

    function updateUrl(id: string) {
        const url = new URL(window.location.href);
        url.searchParams.set("draft", id);
        window.history.replaceState({}, "", url.toString());
    }

    // --- Step 1: Save Basic Info ---
    async function saveStep1(): Promise<boolean> {
        if (!basicInfo.name.trim()) {
            toast.error("Software name is required");
            return false;
        }

        try {
            if (!softwareId) {
                // Create new software
                const res = await fetch("/api/software", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...basicInfo,
                        status: "draft",
                        completedSteps: 1,
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to create software");
                    return false;
                }
                const id = data.software._id;
                setSoftwareId(id);
                updateUrl(id);
            } else {
                // Update existing draft
                const res = await fetch(`/api/software/${softwareId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...basicInfo,
                        completedSteps: Math.max(1, completedSteps),
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to update software");
                    return false;
                }
            }
            setCompletedSteps((prev) => Math.max(prev, 1));
            return true;
        } catch {
            toast.error("Something went wrong");
            return false;
        }
    }

    // --- Step 2: Save Media ---
    async function saveStep2(): Promise<boolean> {
        if (!softwareId) return false;

        try {
            let iconKey = media.existingLogoKey;

            // Upload new logo if selected
            if (media.logoFile) {
                const uploadData = new FormData();
                uploadData.append("file", media.logoFile);
                const uploadRes = await fetch("/api/upload/image", { method: "POST", body: uploadData });
                if (!uploadRes.ok) {
                    toast.error("Logo upload failed");
                    return false;
                }
                const result = await uploadRes.json();
                iconKey = result.key;
            }

            // Upload new screenshots
            const newScreenshotKeys: string[] = [];
            for (const file of media.screenshotFiles) {
                const uploadData = new FormData();
                uploadData.append("file", file);
                const uploadRes = await fetch("/api/upload/image", { method: "POST", body: uploadData });
                if (!uploadRes.ok) {
                    toast.error(`Failed to upload screenshot: ${file.name}`);
                    return false;
                }
                const result = await uploadRes.json();
                newScreenshotKeys.push(result.key);
            }

            const screenshotKeys = [...media.existingScreenshotKeys, ...newScreenshotKeys];

            const res = await fetch(`/api/software/${softwareId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    iconKey,
                    screenshotKeys,
                    completedSteps: Math.max(2, completedSteps),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to save media");
                return false;
            }

            // Update media state so existing keys are correct if user navigates back
            setMedia({
                logoFile: null,
                logoPreview: null,
                existingLogoKey: iconKey,
                screenshotFiles: [],
                screenshotPreviews: [],
                existingScreenshotKeys: screenshotKeys,
            });

            setCompletedSteps((prev) => Math.max(prev, 2));
            return true;
        } catch {
            toast.error("Something went wrong");
            return false;
        }
    }

    // --- Step 3: Save Version ---
    async function saveStep3(skip: boolean): Promise<boolean> {
        if (!softwareId) return false;

        try {
            if (!skip) {
                if (!version.versionNumber.trim()) {
                    toast.error("Version number is required");
                    return false;
                }
                if (!version.file) {
                    toast.error("Please upload a file for this version");
                    return false;
                }

                // 1. Get presigned URL
                const presignRes = await fetch("/api/upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: version.file.name,
                        contentType: version.file.type || "application/octet-stream",
                    }),
                });
                if (!presignRes.ok) {
                    toast.error("Failed to get upload URL");
                    return false;
                }
                const { uploadUrl, key: fileKey } = await presignRes.json();

                // 2. Upload file to presigned URL with progress tracking
                const fileSize = version.file.size;
                setUploadStats({ percent: 0, loaded: 0, total: fileSize, speed: 0, elapsed: 0, remaining: 0 });
                const uploadOk = await new Promise<boolean>((resolve) => {
                    const startTime = Date.now();
                    let lastLoaded = 0;
                    let lastTime = startTime;
                    let smoothSpeed = 0;

                    const xhr = new XMLHttpRequest();
                    xhr.upload.addEventListener("progress", (e) => {
                        if (!e.lengthComputable) return;
                        const now = Date.now();
                        const elapsedMs = now - startTime;
                        const elapsed = elapsedMs / 1000;
                        const intervalMs = now - lastTime;

                        // Calculate instantaneous speed over the interval, smooth with EMA
                        if (intervalMs > 100) {
                            const intervalSpeed = ((e.loaded - lastLoaded) / intervalMs) * 1000;
                            smoothSpeed = smoothSpeed === 0 ? intervalSpeed : smoothSpeed * 0.7 + intervalSpeed * 0.3;
                            lastLoaded = e.loaded;
                            lastTime = now;
                        }

                        const remaining = smoothSpeed > 0 ? (e.total - e.loaded) / smoothSpeed : 0;

                        setUploadStats({
                            percent: Math.round((e.loaded / e.total) * 100),
                            loaded: e.loaded,
                            total: e.total,
                            speed: smoothSpeed,
                            elapsed,
                            remaining,
                        });
                    });
                    xhr.addEventListener("load", () => resolve(xhr.status >= 200 && xhr.status < 300));
                    xhr.addEventListener("error", () => resolve(false));
                    xhr.addEventListener("abort", () => resolve(false));
                    xhr.open("PUT", uploadUrl);
                    xhr.setRequestHeader("Content-Type", version.file!.type || "application/octet-stream");
                    xhr.send(version.file);
                });
                setUploadStats(null);
                if (!uploadOk) {
                    toast.error("File upload failed");
                    return false;
                }

                // 3. Create version
                const versionRes = await fetch(`/api/software/${softwareId}/versions`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        versionNumber: version.versionNumber,
                        releaseNotes: version.releaseNotes,
                        platform: version.platform,
                        architecture: version.architecture,
                        fileKey,
                        fileName: version.file.name,
                        fileSize: version.file.size,
                    }),
                });
                if (!versionRes.ok) {
                    const data = await versionRes.json();
                    toast.error(data.error || "Failed to create version");
                    return false;
                }

                setHasVersion(true);
            }

            // 4. Update completedSteps
            const res = await fetch(`/api/software/${softwareId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completedSteps: Math.max(3, completedSteps) }),
            });
            if (!res.ok) {
                toast.error("Failed to save progress");
                return false;
            }

            setCompletedSteps((prev) => Math.max(prev, 3));
            return true;
        } catch {
            toast.error("Something went wrong");
            return false;
        }
    }

    // --- Step 4: Publish ---
    async function publish(): Promise<boolean> {
        if (!softwareId) return false;

        try {
            const res = await fetch(`/api/software/${softwareId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "published", completedSteps: 4 }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to publish");
                return false;
            }
            setCompletedSteps(4);
            return true;
        } catch {
            toast.error("Something went wrong");
            return false;
        }
    }

    // --- Button handlers ---
    async function handleSaveAndContinue() {
        setLoading(true);
        try {
            let ok = false;
            if (currentStep === 1) ok = await saveStep1();
            else if (currentStep === 2) ok = await saveStep2();
            else if (currentStep === 3) ok = await saveStep3(false);
            else if (currentStep === 4) {
                ok = await publish();
                if (ok) {
                    toast.success("Software published successfully!");
                    router.push(`/admin/software/${softwareId}`);
                    return;
                }
            }

            if (ok && currentStep < 4) {
                toast.success("Saved!");
                setCurrentStep(currentStep + 1);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSkipStep() {
        if (currentStep !== 3) return;
        setLoading(true);
        try {
            const ok = await saveStep3(true);
            if (ok) {
                toast.success("Step skipped");
                setCurrentStep(4);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveAsDraft() {
        setLoading(true);
        try {
            let ok = false;
            if (currentStep === 1) ok = await saveStep1();
            else if (currentStep === 2) ok = await saveStep2();
            else if (currentStep === 3) ok = await saveStep3(true);
            else if (currentStep === 4) {
                // Save as draft from review - just ensure status stays draft
                if (softwareId) {
                    const res = await fetch(`/api/software/${softwareId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "draft" }),
                    });
                    ok = res.ok;
                }
            }

            if (ok) {
                toast.success("Saved as draft");
                router.push("/admin/software");
            }
        } finally {
            setLoading(false);
        }
    }

    function handleStepClick(step: number) {
        if (step <= completedSteps || step === completedSteps + 1) {
            setCurrentStep(step);
        }
    }

    if (loadingDraft) {
        return (
            <div className="p-6 max-w-3xl flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6">
                {softwareId ? "Edit Software Draft" : "Add New Software"}
            </h1>

            <Stepper
                currentStep={currentStep}
                completedSteps={completedSteps}
                onStepClick={handleStepClick}
            />

            <Card className="border-border/50">
                <CardContent className="p-6">
                    {currentStep === 1 && (
                        <StepBasicInfo data={basicInfo} onChange={setBasicInfo} />
                    )}
                    {currentStep === 2 && (
                        <StepMedia data={media} onChange={setMedia} />
                    )}
                    {currentStep === 3 && (
                        <StepVersion data={version} onChange={setVersion} uploadStats={uploadStats} />
                    )}
                    {currentStep === 4 && (
                        <StepReview
                            basicInfo={basicInfo}
                            media={media}
                            version={version}
                            hasVersion={hasVersion}
                        />
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSaveAsDraft}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save as Draft
                        </Button>

                        <div className="flex items-center gap-2">
                            {currentStep === 3 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleSkipStep}
                                    disabled={loading}
                                >
                                    <SkipForward className="mr-2 h-4 w-4" />
                                    Skip this step
                                </Button>
                            )}
                            <Button
                                type="button"
                                onClick={handleSaveAndContinue}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : currentStep === 4 ? (
                                    <Send className="mr-2 h-4 w-4" />
                                ) : (
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                )}
                                {currentStep === 4 ? "Publish" : "Save & Continue"}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
