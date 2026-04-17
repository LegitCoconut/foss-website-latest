"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { Loader2 } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    url: string;
    scale?: number;
    onNumPagesChange?: (n: number) => void;
}

export default function PdfViewer({ url, scale = 1, onNumPagesChange }: PdfViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        onNumPagesChange?.(numPages);
    }

    return (
        <div className="w-full h-full overflow-auto flex items-start justify-center py-4" onClick={(e) => e.stopPropagation()}>
            <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                    <div className="p-12 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                }
                error={
                    <div className="p-12 text-center text-white/70">
                        Failed to load PDF
                    </div>
                }
                className="flex flex-col items-center gap-3"
            >
                {Array.from({ length: numPages }, (_, i) => (
                    <Page
                        key={`page-${i + 1}`}
                        pageNumber={i + 1}
                        scale={scale}
                        renderAnnotationLayer
                        renderTextLayer
                        className="shadow-lg"
                    />
                ))}
            </Document>
        </div>
    );
}
