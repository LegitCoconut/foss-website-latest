import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyTotpCode } from "@/lib/totp";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// 10 attempts per 15 min to prevent brute-forcing TOTP during setup
const limiter = rateLimit({ interval: 15 * 60_000, limit: 10 });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = limiter.check(session.user.id);
    if (!rl.success) return rateLimitResponse(rl.reset, { req: request, path: "/api/auth/totp/verify", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

    const { code } = await request.json();

    await dbConnect();

    const user = await User.findById(session.user.id).select("+totpSecret");

    if (!user?.totpSecret) {
      return NextResponse.json(
        { error: "Please set up TOTP first" },
        { status: 400 }
      );
    }

    const isValid = verifyTotpCode(user.totpSecret, code);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    user.totpEnabled = true;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TOTP verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
