import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import SoftwareRequest from "@/models/SoftwareRequest";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status") || "";
        const isAdmin = (session.user as { role?: string }).role === "admin";

        const query: Record<string, unknown> = {};

        if (!isAdmin) {
            query.userId = session.user.id;
        }

        if (status) {
            query.status = status;
        }

        const requests = await SoftwareRequest.find(query)
            .sort({ createdAt: -1 })
            .lean();

        // Populate user info for admin
        if (isAdmin) {
            const userIds = [...new Set(requests.map((r) => r.userId.toString()))];
            const users = await User.find({ _id: { $in: userIds } })
                .select("name email")
                .lean();
            const userMap = new Map(users.map((u) => [u._id.toString(), u]));

            const enriched = requests.map((r) => ({
                ...r,
                userName: userMap.get(r.userId.toString())?.name || "Unknown",
                userEmail: userMap.get(r.userId.toString())?.email || "",
            }));

            return NextResponse.json({ requests: enriched });
        }

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Requests list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const body = await req.json();

        const request = await SoftwareRequest.create({
            userId: session.user.id,
            type: body.type || "software-request",
            title: body.title,
            description: body.description,
            url: body.url || "",
        });

        return NextResponse.json({ request }, { status: 201 });
    } catch (error) {
        console.error("Request create error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
