import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { BLOCKED_INLINE_CONTENT_TYPES } from "@/lib/team-storage-config";

// Stream files inline with auth. Used for "Open in new tab" and any
// direct linking that must require a valid session.
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
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/team-storage/[teamId]/files/[fileId]/inline", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const storedCt = (file.contentType || "application/octet-stream").toLowerCase();
        // Defense in depth: never serve dangerous content types inline
        const safeCt = BLOCKED_INLINE_CONTENT_TYPES.has(storedCt)
            ? "application/octet-stream"
            : file.contentType || "application/octet-stream";

        const command = new GetObjectCommand({
            Bucket: process.env.S3_FILES_BUCKET!,
            Key: file.fileKey,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // Build response with the S3 stream body (ReadableStream)
        const body = response.Body as unknown as ReadableStream;
        return new NextResponse(body, {
            headers: {
                "Content-Type": safeCt,
                "Content-Disposition": `inline; filename="${file.fileName.replace(/[\x00-\x1f\x7f"\\]/g, "_")}"`,
                ...(response.ContentLength && {
                    "Content-Length": String(response.ContentLength),
                }),
                // Prevent caching proxies from caching this per-user response
                "Cache-Control": "private, no-store",
            },
        });
    } catch (error: unknown) {
        const code = (error as { name?: string })?.name;
        if (code === "NoSuchKey") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        console.error("Team file inline error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
