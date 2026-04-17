import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import User from "@/models/User";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 3600_000, limit: 120 });

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/admin/team-storage/[id]/members", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const team = await Team.findByIdAndUpdate(
            id,
            { $addToSet: { members: userId } },
            { new: true }
        ).populate("members", "name email");

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        return NextResponse.json({ team });
    } catch (error) {
        console.error("Add member error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/admin/team-storage/[id]/members", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 });
        }

        const team = await Team.findByIdAndUpdate(
            id,
            { $pull: { members: userId } },
            { new: true }
        ).populate("members", "name email");

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        return NextResponse.json({ team });
    } catch (error) {
        console.error("Remove member error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
