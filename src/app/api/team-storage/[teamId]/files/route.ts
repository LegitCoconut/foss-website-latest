import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import DownloadLog from "@/models/DownloadLog";
import { getPresignedUploadUrl, deleteFile } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { SYSTEM_MAX_FILE_SIZE, BLOCKED_INLINE_CONTENT_TYPES } from "@/lib/team-storage-config";
import crypto from "crypto";
import path from "path";

const uploadLimiter = rateLimit({ interval: 3600_000, limit: 60 }); // 60 uploads per hour
const deleteLimiter = rateLimit({ interval: 3600_000, limit: 60 });

const MAX_FILENAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 500;

// Sanitize filename: strip path components, null bytes, and control characters
function sanitizeFileName(name: string): string {
    // Take only the base name (no path traversal)
    let safe = path.basename(name);
    // Remove null bytes and control characters
    safe = safe.replace(/[\x00-\x1f\x7f]/g, "");
    // Remove leading dots (hidden files)
    safe = safe.replace(/^\.+/, "");
    // Truncate
    if (safe.length > MAX_FILENAME_LENGTH) {
        const ext = path.extname(safe);
        safe = safe.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    }
    return safe || "unnamed";
}

// Sanitize file extension: only allow alphanumeric chars
function sanitizeExt(name: string): string {
    const ext = path.extname(name).replace(/^\./, "").toLowerCase();
    return /^[a-z0-9]+$/.test(ext) ? ext : "bin";
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const { teamId } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const isMember = team.members.some((m) => m.toString() === session.user!.id);
        const isAdmin = (session.user as { role?: string }).role === "admin";
        if (!isMember && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = uploadLimiter.check(session.user!.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/team-storage/[teamId]/files", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        if (team.status === "suspended") {
            return NextResponse.json({ error: "Team is suspended — uploads are disabled" }, { status: 403 });
        }

        const { fileName: rawFileName, contentType: rawContentType, fileSize, description: rawDescription } = await req.json();

        if (!rawFileName || !fileSize) {
            return NextResponse.json({ error: "fileName and fileSize are required" }, { status: 400 });
        }

        // Effective per-file limit: team override or system default
        const effectiveMax = team.maxFileSize ?? SYSTEM_MAX_FILE_SIZE;

        // Validate fileSize is a positive number within bounds
        if (typeof fileSize !== "number" || fileSize <= 0 || fileSize > effectiveMax) {
            const limitMB = Math.floor(effectiveMax / (1024 * 1024));
            return NextResponse.json({ error: `File size must be between 1 byte and ${limitMB} MB (team limit)` }, { status: 400 });
        }

        // Sanitize inputs
        const fileName = sanitizeFileName(String(rawFileName));
        const contentType = BLOCKED_INLINE_CONTENT_TYPES.has(String(rawContentType || "").toLowerCase())
            ? "application/octet-stream"
            : String(rawContentType || "application/octet-stream");
        const description = String(rawDescription || "").slice(0, MAX_DESCRIPTION_LENGTH).trim();
        const ext = sanitizeExt(fileName);

        // Check storage quota
        const [stats] = await TeamFile.aggregate([
            { $match: { teamId: team._id } },
            { $group: { _id: null, total: { $sum: "$fileSize" } } },
        ]);
        const currentUsed = stats?.total || 0;

        if (currentUsed + fileSize > team.storageLimit) {
            return NextResponse.json(
                { error: "Upload would exceed team storage limit" },
                { status: 400 }
            );
        }

        // Generate S3 key with sanitized extension
        const key = `team-storage/${teamId}/${crypto.randomUUID()}.${ext}`;

        const uploadUrl = await getPresignedUploadUrl(
            process.env.S3_FILES_BUCKET!,
            key,
            contentType,
            600
        );

        // Create file record
        const teamFile = await TeamFile.create({
            teamId: team._id,
            uploadedBy: session.user.id,
            fileKey: key,
            fileName,
            fileSize,
            contentType,
            description,
        });

        // Log upload
        const forwarded = req.headers.get("x-forwarded-for");
        const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
        const ipAddress = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

        await DownloadLog.create({
            userId: session.user.id,
            userName: session.user.name || "",
            userEmail: session.user.email || "",
            ipAddress,
            type: "team-upload",
            teamId: team._id,
            teamName: team.name,
            fileName,
        });

        return NextResponse.json({
            uploadUrl,
            key,
            fileName,
            fileId: teamFile._id,
        });
    } catch (error) {
        console.error("Team file upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const { teamId } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const isMemberDel = team.members.some((m) => m.toString() === session.user!.id);
        const isAdminDel = (session.user as { role?: string }).role === "admin";
        if (!isMemberDel && !isAdminDel) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const rl2 = deleteLimiter.check(session.user!.id);
        if (!rl2.success) return rateLimitResponse(rl2.reset, { req: req, path: "/api/team-storage/[teamId]/files", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const { fileId } = await req.json();
        if (!fileId) {
            return NextResponse.json({ error: "fileId is required" }, { status: 400 });
        }

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Admins can delete any file; members can only delete their own
        if (!isAdminDel && file.uploadedBy.toString() !== session.user.id) {
            return NextResponse.json({ error: "You can only delete your own files" }, { status: 403 });
        }

        await deleteFile(process.env.S3_FILES_BUCKET!, file.fileKey);
        await TeamFile.findByIdAndDelete(fileId);

        return NextResponse.json({ message: "File deleted" });
    } catch (error) {
        console.error("Team file delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
