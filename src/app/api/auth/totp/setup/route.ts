import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { encryptSecret, generateTotpSecret } from "@/lib/totp";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 10 QR code regenerations per hour per user
const limiter = rateLimit({ interval: 3600_000, limit: 10 });

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req, path: "/api/auth/totp/setup", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();

        const result = await generateTotpSecret(session.user.email!);
        const encrypted = encryptSecret(result.secret);

        await User.findByIdAndUpdate(
            session.user.id,
            { totpSecret: encrypted },
            { returnDocument: "after" }
        );

        return NextResponse.json({
            qrCodeDataUrl: result.qrCodeDataUrl,
            manualSecret: result.secret,
        });
    } catch (error) {
        console.error("TOTP setup error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
