// System-wide max file size for team storage uploads (2 GB).
// Teams can set a lower per-team override via Team.maxFileSize.
export const SYSTEM_MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

// Minimum per-team maxFileSize (1 MB) to prevent impractical settings.
export const MIN_TEAM_MAX_FILE_SIZE = 1024 * 1024;

// Content types blocked from being served inline (prevents stored XSS
// via the preview endpoint, defense-in-depth). These should also be
// normalized to application/octet-stream at upload time.
export const BLOCKED_INLINE_CONTENT_TYPES = new Set([
    "text/html",
    "application/xhtml+xml",
    "application/javascript",
    "text/javascript",
    "image/svg+xml",
]);

export type PreviewKind = "image" | "video" | "pdf" | "text" | null;

const TEXT_EXTENSIONS = [
    "txt", "md", "markdown", "json", "jsonc", "yaml", "yml",
    "js", "jsx", "ts", "tsx", "mjs", "cjs",
    "py", "rb", "go", "rs", "c", "cc", "cpp", "h", "hpp",
    "java", "kt", "scala", "swift",
    "css", "scss", "sass", "less",
    "xml", "toml", "ini", "conf", "cfg", "env",
    "sh", "bash", "zsh", "fish", "ps1",
    "sql", "log", "csv", "tsv",
    "dockerfile", "gitignore", "editorconfig",
];

function getExtension(fileName: string): string {
    const parts = fileName.toLowerCase().split(".");
    return parts.length > 1 ? parts.pop() || "" : "";
}

export function getPreviewKind(contentType: string, fileName: string): PreviewKind {
    const ct = (contentType || "").toLowerCase();
    const ext = getExtension(fileName);

    if (ct.startsWith("image/") && !BLOCKED_INLINE_CONTENT_TYPES.has(ct)) return "image";
    if (ct.startsWith("video/")) return "video";
    if (ct === "application/pdf" || ext === "pdf") return "pdf";

    if (ct.startsWith("text/") && !BLOCKED_INLINE_CONTENT_TYPES.has(ct)) return "text";
    if (TEXT_EXTENSIONS.includes(ext)) return "text";

    // Fallback by extension for common image/video types when content-type
    // was saved as octet-stream
    const imageExts = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "ico"];
    const videoExts = ["mp4", "webm", "mov", "mkv", "avi", "m4v"];
    if (imageExts.includes(ext)) return "image";
    if (videoExts.includes(ext)) return "video";

    return null;
}

export function isPreviewable(contentType: string, fileName: string): boolean {
    return getPreviewKind(contentType, fileName) !== null;
}
