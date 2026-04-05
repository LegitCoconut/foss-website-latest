import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import DownloadLog from "@/models/DownloadLog";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 3600_000, limit: 100 });

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

        if (!team.members.some((m) => m.toString() === session.user!.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const rl = limiter.check(session.user!.id);
        if (!rl.success) return rateLimitResponse(rl.reset);

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const url = await getPresignedDownloadUrl(
            process.env.S3_FILES_BUCKET!,
            file.fileKey,
            300,
            file.fileName
        );

        // Log download
        const forwarded = req.headers.get("x-forwarded-for");
        const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
        const ipAddress = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

        await DownloadLog.create({
            userId: session.user.id,
            userName: session.user.name || "",
            userEmail: session.user.email || "",
            ipAddress,
            type: "team-download",
            teamId: team._id,
            teamName: team.name,
            fileName: file.fileName,
        });

        return NextResponse.json({ url, fileName: file.fileName });
    } catch (error) {
        console.error("Team file download error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
