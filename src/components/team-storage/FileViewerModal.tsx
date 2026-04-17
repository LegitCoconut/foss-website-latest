"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
    X,
    Download,
    ExternalLink,
    Loader2,
    FileIcon,
    AlertTriangle,
    Pencil,
    HardDrive,
    Calendar,
    User,
    Image as ImageIcon,
    Video,
    FileText,
    File as FileLucide,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeamFileItem } from "@/types";
import { getPreviewKind } from "@/lib/team-storage-config";
import { formatBytes } from "./utils";

const PdfViewer = dynamic(() => import("./PdfViewer"), {
    ssr: false,
    loading: () => <Loader2 className="h-8 w-8 animate-spin text-white" />,
});

interface FileViewerModalProps {
    files: TeamFileItem[];
    startIndex: number;
    teamId: string;
    onClose: () => void;
    onDownload: (file: TeamFileItem) => void;
    canEdit?: (file: TeamFileItem) => boolean;
    onEdit?: (file: TeamFileItem, content: string) => void;
}

function getFileKindIcon(kind: ReturnType<typeof getPreviewKind>) {
    if (kind === "image") return ImageIcon;
    if (kind === "video") return Video;
    if (kind === "pdf" || kind === "text") return FileText;
    return FileLucide;
}

export function FileViewerModal({
    files,
    startIndex,
    teamId,
    onClose,
    onDownload,
    canEdit,
    onEdit,
}: FileViewerModalProps) {
    const [currentIndex] = useState(startIndex);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [textContent, setTextContent] = useState<string | null>(null);
    const [textLoading, setTextLoading] = useState(false);
    const [pdfScale, setPdfScale] = useState(1);

    const currentFile = files[currentIndex];

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [onClose]);

    useEffect(() => {
        let cancelled = false;
        if (!currentFile) return;

        setLoading(true);
        setError(null);
        setPreviewUrl(null);
        setTextContent(null);

        (async () => {
            try {
                const res = await fetch(
                    `/api/team-storage/${teamId}/files/${currentFile._id}/preview`
                );
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    if (!cancelled) {
                        setError(data.error || "Preview unavailable");
                        setLoading(false);
                    }
                    return;
                }
                const data = await res.json();
                if (!cancelled) {
                    setPreviewUrl(data.url);
                    setLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setError("Preview unavailable");
                    setLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentFile, teamId]);

    useEffect(() => {
        let cancelled = false;
        if (!previewUrl || !currentFile) return;
        const kind = getPreviewKind(currentFile.contentType, currentFile.fileName);
        if (kind !== "text") return;

        setTextLoading(true);
        setTextContent(null);
        (async () => {
            try {
                const res = await fetch(previewUrl);
                if (!res.ok) throw new Error("Failed to load text");
                const text = await res.text();
                if (!cancelled) {
                    setTextContent(text);
                    setTextLoading(false);
                }
            } catch {
                if (!cancelled) {
                    setError("Preview unavailable");
                    setTextLoading(false);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [previewUrl, currentFile]);

    if (!currentFile) return null;

    const kind = getPreviewKind(currentFile.contentType, currentFile.fileName);
    const KindIcon = getFileKindIcon(kind);

    function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
        if (e.target === e.currentTarget) onClose();
    }

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90"
            onClick={handleBackdropClick}
        >
            {/* Close button — always visible top-right */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-20 h-9 w-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition"
                aria-label="Close"
            >
                <X className="h-5 w-5" />
            </button>

            {/* Main layout: sidebar + content */}
            <div
                className="flex h-full w-full p-4 gap-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Left sidebar: file info + actions */}
                <aside className="w-72 flex-shrink-0 rounded-lg bg-neutral-900/90 border border-white/10 flex flex-col overflow-hidden">
                    {/* File header */}
                    <div className="p-4 border-b border-white/10 space-y-3">
                        <div className="flex items-start gap-2.5">
                            <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0">
                                <KindIcon className="h-4 w-4 text-white/80" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-white break-all leading-tight">
                                    {currentFile.fileName}
                                </p>
                            </div>
                        </div>

                        {currentFile.description && (
                            <p className="text-xs text-white/60 leading-relaxed">
                                {currentFile.description}
                            </p>
                        )}
                    </div>

                    {/* Metadata */}
                    <div className="p-4 border-b border-white/10 space-y-2.5 text-xs">
                        <div className="flex items-center gap-2 text-white/70">
                            <HardDrive className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="font-mono tabular-nums">{formatBytes(currentFile.fileSize)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                            <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{new Date(currentFile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                        </div>
                        {currentFile.uploadedBy?.name && (
                            <div className="flex items-center gap-2 text-white/70">
                                <User className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{currentFile.uploadedBy.name}</span>
                            </div>
                        )}
                        {currentFile.contentType && (
                            <div className="flex items-start gap-2 text-white/50">
                                <span className="font-mono text-[10px] uppercase tracking-wider">Type</span>
                                <span className="font-mono text-[11px] break-all">{currentFile.contentType}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="p-4 space-y-2 flex-1">
                        <Button
                            size="sm"
                            onClick={() => onDownload(currentFile)}
                            className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/20"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>

                        {kind === "text" && onEdit && canEdit?.(currentFile) && textContent !== null && (
                            <Button
                                size="sm"
                                onClick={() => onEdit(currentFile, textContent)}
                                className="w-full justify-start bg-white/10 hover:bg-white/20 text-white border border-white/20"
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                            </Button>
                        )}

                        {previewUrl && (
                            <a
                                href={`/api/team-storage/${teamId}/files/${currentFile._id}/inline`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-md bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 h-9 text-sm font-medium transition w-full"
                            >
                                <ExternalLink className="h-4 w-4" />
                                Open in new tab
                            </a>
                        )}

                        {/* PDF zoom controls */}
                        {kind === "pdf" && previewUrl && (
                            <div className="pt-2 border-t border-white/10 mt-3">
                                <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2">
                                    Zoom
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setPdfScale((s) => Math.max(0.5, s - 0.25))}
                                        disabled={pdfScale <= 0.5}
                                        className="h-8 w-8 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition disabled:opacity-40"
                                        aria-label="Zoom out"
                                    >
                                        <ZoomOut className="h-4 w-4" />
                                    </button>
                                    <div className="flex-1 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-white/80 text-xs font-mono tabular-nums">
                                        {Math.round(pdfScale * 100)}%
                                    </div>
                                    <button
                                        onClick={() => setPdfScale((s) => Math.min(3, s + 0.25))}
                                        disabled={pdfScale >= 3}
                                        className="h-8 w-8 rounded-md bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition disabled:opacity-40"
                                        aria-label="Zoom in"
                                    >
                                        <ZoomIn className="h-4 w-4" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setPdfScale(1)}
                                    className="mt-2 w-full h-7 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/10 transition"
                                >
                                    Reset to 100%
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Right side: preview content */}
                <div className="flex-1 min-w-0 flex items-center justify-center overflow-auto">
                    {loading && (
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                    )}

                    {!loading && error && (
                        <div className="rounded-lg bg-white/5 border border-white/10 p-8 max-w-sm text-center">
                            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                            <p className="text-white text-sm font-medium mb-1">
                                Preview unavailable
                            </p>
                            <p className="text-white/60 text-xs mb-4">
                                {error || "This file can't be previewed."}
                            </p>
                            <Button
                                size="sm"
                                onClick={() => onDownload(currentFile)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    )}

                    {!loading && !error && previewUrl && kind === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={previewUrl}
                            alt={currentFile.fileName}
                            className="max-h-full max-w-full object-contain rounded-lg"
                        />
                    )}

                    {!loading && !error && previewUrl && kind === "video" && (
                        <video
                            src={previewUrl}
                            controls
                            preload="metadata"
                            className="max-h-full max-w-full rounded-lg"
                        />
                    )}

                    {!loading && !error && previewUrl && kind === "pdf" && (
                        <PdfViewer url={previewUrl} scale={pdfScale} />
                    )}

                    {!loading && !error && previewUrl && kind === "text" && (
                        <>
                            {textLoading ? (
                                <Loader2 className="h-10 w-10 animate-spin text-white" />
                            ) : (
                                <pre className="whitespace-pre-wrap break-words bg-neutral-900/90 border border-white/10 text-neutral-100 p-6 rounded-lg w-full h-full overflow-auto text-sm font-mono">
                                    {textContent ?? ""}
                                </pre>
                            )}
                        </>
                    )}

                    {!loading && !error && previewUrl && kind === null && (
                        <div className="rounded-lg bg-white/5 border border-white/10 p-8 max-w-sm text-center">
                            <FileIcon className="h-8 w-8 text-white/60 mx-auto mb-3" />
                            <p className="text-white text-sm font-medium mb-1">
                                {currentFile.fileName}
                            </p>
                            <p className="text-white/60 text-xs mb-4">
                                This file can&apos;t be previewed.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => onDownload(currentFile)}
                                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
