import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyTotpCode } from "@/lib/totp";
import { rateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

// Strict rate limit for brute-force protection: 10 attempts per 15 minutes
// Keyed by user ID + IP to defend against credential stuffing
const limiter = rateLimit({ interval: 15 * 60_000, limit: 10 });

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const ip = getClientIp(request);
        const rl = limiter.check(`${session.user.id}:${ip}`);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: request, path: "/api/auth/totp/validate", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const { code } = await request.json();

        await dbConnect();

        const user = await User.findById(session.user.id).select("+totpSecret");

        if (!user?.totpSecret) {
            return NextResponse.json(
                { error: "TOTP not configured" },
                { status: 400 }
            );
        }

        const isValid = verifyTotpCode(user.totpSecret, code);
        if (!isValid) {
            return NextResponse.json({ error: "Invalid code" }, { status: 401 });
        }

        user.mfaVerifiedAt = new Date();
        await user.save();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("TOTP validate error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
