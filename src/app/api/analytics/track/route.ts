import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PageVisit from "@/models/PageVisit";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 30 }); // 30 per min per IP

export async function POST(req: Request) {
    try {
        const ip = getClientIp(req);
        const { success, reset } = limiter.check(ip);
        if (!success) return rateLimitResponse(reset, { req, path: "/api/analytics/track" });

        const body = await req.json();
        const userAgent = req.headers.get("user-agent") || "";

        await dbConnect();

        await PageVisit.create({
            path: body.path,
            userId: body.userId || null,
            userAgent,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Page track error:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
