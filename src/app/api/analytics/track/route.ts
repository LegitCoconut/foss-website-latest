import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PageVisit from "@/models/PageVisit";

export async function POST(req: Request) {
    try {
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
