import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DownloadLog from "@/models/DownloadLog";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const downloads = await DownloadLog.find({ userId: session.user.id })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return NextResponse.json({
            downloads: downloads.map((d) => ({
                _id: d._id,
                softwareName: d.softwareName,
                versionNumber: d.versionNumber,
                softwareId: d.softwareId,
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
