import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DownloadLog from "@/models/DownloadLog";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 30 });

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req, path: "/api/downloads", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();

        const downloads = await DownloadLog.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({
            downloads: downloads.map((d) => ({
                _id: d._id,
                type: d.type || "software",
                softwareName: d.softwareName,
                versionNumber: d.versionNumber,
                softwareId: d.softwareId,
                teamName: d.teamName || "",
                teamId: d.teamId,
                fileName: d.fileName || "",
                createdAt: d.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Downloads list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
