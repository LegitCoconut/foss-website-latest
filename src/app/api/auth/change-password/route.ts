import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 3600_000, limit: 5 }); // 5 per hour

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset);

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Current password and new password are required" }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
        }

        if (currentPassword === newPassword) {
            return NextResponse.json({ error: "New password must be different from current password" }, { status: 400 });
        }

        await dbConnect();

        const user = await User.findById(session.user.id).select("+password");
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return NextResponse.json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
