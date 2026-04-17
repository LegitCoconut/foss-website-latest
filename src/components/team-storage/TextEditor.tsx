"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, X, Loader2 } from "lucide-react";

// Lazy-load CodeMirror (it touches `window` on import)
const CodeMirror = dynamic(
    () => import("@uiw/react-codemirror").then((mod) => mod.default),
    {
        ssr: false,
        loading: () => (
            <div className="h-[60vh] flex items-center justify-center bg-neutral-900/50 rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-white/60" />
            </div>
        ),
    }
);

interface TextEditorProps {
    teamId: string;
    mode: "create" | "edit";
    initialContent?: string;
    fileName?: string;
    fileId?: string;
    onSaved: () => void;
    onCancel: () => void;
}

function getExt(name: string): string {
    const parts = name.toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() || "" : "";
}

async function loadLanguageExtension(ext: string) {
    if (["js", "jsx", "ts", "tsx", "mjs", "cjs"].includes(ext)) {
        const { javascript } = await import("@codemirror/lang-javascript");
        return [javascript({ jsx: true, typescript: ext === "ts" || ext === "tsx" })];
    }
    if (ext === "json" || ext === "jsonc") {
        const { json } = await import("@codemirror/lang-json");
        return [json()];
    }
    if (ext === "md" || ext === "markdown") {
        const { markdown } = await import("@codemirror/lang-markdown");
        return [markdown()];
    }
    return [];
}

export function TextEditor({
    teamId,
    mode,
    initialContent = "",
    fileName: initialFileName = "",
    fileId,
    onSaved,
    onCancel,
}: TextEditorProps) {
    const [fileName, setFileName] = useState(initialFileName || "untitled.txt");
    const [content, setContent] = useState(initialContent);
    const [saving, setSaving] = useState(false);
    const [extensions, setExtensions] = useState<unknown[]>([]);

    // Load language extension based on file extension
    useMemo(() => {
        loadLanguageExtension(getExt(fileName)).then(setExtensions);
    }, [fileName]);

    async function uploadToS3(uploadUrl: string, text: string): Promise<boolean> {
        try {
            const res = await fetch(uploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "text/plain" },
                body: text,
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async function handleSave() {
        if (!fileName.trim()) {
            toast.error("File name is required");
            return;
        }
        if (content.length === 0) {
            toast.error("File cannot be empty");
            return;
        }

        setSaving(true);
        try {
            const size = new Blob([content]).size;

            let presignData: { uploadUrl: string };

            if (mode === "edit" && fileId) {
                // Overwrite in place — uses same fileKey (preserves owner/sharedWith)
                const res = await fetch(`/api/team-storage/${teamId}/files/${fileId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "overwrite",
                        fileSize: size,
                        contentType: "text/plain",
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to update file");
                    return;
                }
                presignData = data;
            } else {
                // Create new file
                const res = await fetch(`/api/team-storage/${teamId}/files`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fileName: fileName.trim(),
                        contentType: "text/plain",
                        fileSize: size,
                        description: "",
                    }),
                });
                const data = await res.json();
                if (!res.ok) {
                    toast.error(data.error || "Failed to prepare upload");
                    return;
                }
                presignData = data;
            }

            // Upload to S3
            const ok = await uploadToS3(presignData.uploadUrl, content);
            if (!ok) {
                toast.error("Upload failed");
                return;
            }

            toast.success(mode === "edit" ? "File updated" : "File created");
            onSaved();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-col gap-4 w-full max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0 flex items-center gap-3">
                    <Label htmlFor="editor-filename" className="text-white/80 text-sm flex-shrink-0">
                        File name
                    </Label>
                    <Input
                        id="editor-filename"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        disabled={mode === "edit"}
                        className="bg-white/5 border-white/10 text-white max-w-md"
                        placeholder="untitled.txt"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
                        <X className="h-3.5 w-3.5 mr-1.5" />
                        Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Save
                    </Button>
                </div>
            </div>

            {/* Editor */}
            <div className="rounded-lg border border-white/10 overflow-hidden bg-neutral-900">
                <CodeMirror
                    value={content}
                    onChange={(value) => setContent(value)}
                    theme="dark"
                    height="70vh"
                    extensions={extensions as never}
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        highlightActiveLine: true,
                        highlightActiveLineGutter: true,
                        autocompletion: true,
                    }}
                />
            </div>

            <p className="text-xs text-white/50 text-center">
                {new Blob([content]).size.toLocaleString()} bytes · {content.split("\n").length} lines
            </p>
        </div>
    );
}
