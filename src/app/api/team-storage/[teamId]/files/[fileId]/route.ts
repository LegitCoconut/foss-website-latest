import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import { getPresignedUploadUrl } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { SYSTEM_MAX_FILE_SIZE, BLOCKED_INLINE_CONTENT_TYPES } from "@/lib/team-storage-config";

const patchLimiter = rateLimit({ interval: 3600_000, limit: 120 });

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ teamId: string; fileId: string }> }
) {
    try {
        const { teamId, fileId } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = patchLimiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/team-storage/[teamId]/files/[fileId]", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();

        const team = await Team.findById(teamId);
        if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

        const isAdmin = (session.user as { role?: string }).role === "admin";
        const isMember = team.members.some((m) => m.toString() === session.user!.id);
        if (!isMember && !isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

        const body = await req.json();
        const { action } = body;

        const isOwner = file.uploadedBy.toString() === session.user.id;
        const isSharedWith = (file.sharedWith || []).some((u) => u.toString() === session.user!.id);
        const canEdit = isOwner || isAdmin || isSharedWith;

        // --- Action: share (owner or admin only) ---
        if (action === "share") {
            if (!isOwner && !isAdmin) {
                return NextResponse.json({ error: "Only the owner or an admin can share" }, { status: 403 });
            }
            const userIds: string[] = Array.isArray(body.sharedWith) ? body.sharedWith : [];
            // Filter: only team members, not the owner
            const validIds = team.members
                .map((m) => m.toString())
                .filter((id) => userIds.includes(id) && id !== file.uploadedBy.toString());

            file.sharedWith = validIds as unknown as typeof file.sharedWith;
            await file.save();
            const updated = await TeamFile.findById(fileId)
                .populate("uploadedBy", "name email")
                .populate("sharedWith", "name email")
                .lean();
            return NextResponse.json({ file: updated });
        }

        // --- Action: overwrite (owner, admin, or sharedWith) ---
        if (action === "overwrite") {
            if (!canEdit) {
                return NextResponse.json({ error: "You don't have permission to edit this file" }, { status: 403 });
            }
            if (team.status === "suspended") {
                return NextResponse.json({ error: "Team is suspended" }, { status: 403 });
            }

            const { fileSize, contentType: rawContentType } = body;
            if (typeof fileSize !== "number" || fileSize <= 0) {
                return NextResponse.json({ error: "fileSize required" }, { status: 400 });
            }
            const effectiveMax = team.maxFileSize ?? SYSTEM_MAX_FILE_SIZE;
            if (fileSize > effectiveMax) {
                return NextResponse.json({ error: `File size exceeds team limit` }, { status: 400 });
            }

            // Storage quota (account for replacing existing size)
            const [stats] = await TeamFile.aggregate([
                { $match: { teamId: team._id } },
                { $group: { _id: null, total: { $sum: "$fileSize" } } },
            ]);
            const currentUsed = (stats?.total || 0) - file.fileSize;
            if (currentUsed + fileSize > team.storageLimit) {
                return NextResponse.json({ error: "Would exceed team storage limit" }, { status: 400 });
            }

            const contentType = BLOCKED_INLINE_CONTENT_TYPES.has(String(rawContentType || "").toLowerCase())
                ? "application/octet-stream"
                : String(rawContentType || file.contentType || "application/octet-stream");

            // Return a presigned URL for the same fileKey — client PUTs new content,
            // overwriting the S3 object. Then we update fileSize/contentType in DB.
            const uploadUrl = await getPresignedUploadUrl(
                process.env.S3_FILES_BUCKET!,
                file.fileKey,
                contentType,
                600
            );

            file.fileSize = fileSize;
            file.contentType = contentType;
            await file.save();

            return NextResponse.json({
                uploadUrl,
                fileKey: file.fileKey,
                fileId: file._id,
            });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (error) {
        console.error("Team file patch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
