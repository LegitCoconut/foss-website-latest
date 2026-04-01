import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import DownloadLog from "@/models/DownloadLog";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "50");

        const query: Record<string, unknown> = {};
        if (search) {
            query.$or = [
                { userName: { $regex: search, $options: "i" } },
                { userEmail: { $regex: search, $options: "i" } },
                { softwareName: { $regex: search, $options: "i" } },
                { ipAddress: { $regex: search, $options: "i" } },
                { fileName: { $regex: search, $options: "i" } },
                { teamName: { $regex: search, $options: "i" } },
                { type: { $regex: search, $options: "i" } },
            ];
        }

        const total = await DownloadLog.countDocuments(query);
        const logs = await DownloadLog.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return NextResponse.json({
            logs,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (error) {
        console.error("Logs error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
