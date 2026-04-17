import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { BLOCKED_INLINE_CONTENT_TYPES } from "@/lib/team-storage-config";

// Higher limit than download — users can navigate quickly through a gallery
const limiter = rateLimit({ interval: 3600_000, limit: 300 });

export async function GET(
    req: Request,
    { params }: { params: Promise<{ teamId: string; fileId: string }> }
) {
    try {
        const { teamId, fileId } = await params;
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

        const rl = limiter.check(session.user!.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/team-storage/[teamId]/files/[fileId]/preview", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        // Defense in depth: never issue inline URLs for dangerous types,
        // even if they somehow got stored (upload path already normalizes these)
        const ct = (file.contentType || "").toLowerCase();
        if (BLOCKED_INLINE_CONTENT_TYPES.has(ct)) {
            return NextResponse.json({ error: "Preview not allowed for this file type" }, { status: 403 });
        }

        // Omit fileName → no Content-Disposition: attachment → browser renders inline
        const url = await getPresignedDownloadUrl(
            process.env.S3_FILES_BUCKET!,
            file.fileKey,
            120
        );

        return NextResponse.json({
            url,
            fileName: file.fileName,
            contentType: file.contentType,
        });
    } catch (error) {
        console.error("Team file preview error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
