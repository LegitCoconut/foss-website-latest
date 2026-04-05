import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { verifyTotpCode } from "@/lib/totp";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { password, code } = await request.json();

    if (session.user.role === "admin") {
      return NextResponse.json(
        { error: "Admins cannot disable MFA" },
        { status: 403 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select(
      "+password +totpSecret"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 401 }
      );
    }

    const isCodeValid = verifyTotpCode(user.totpSecret, code);
    if (!isCodeValid) {
      return NextResponse.json(
        { error: "Invalid TOTP code" },
        { status: 400 }
      );
    }

    user.totpEnabled = false;
    user.totpSecret = "";
    await user.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("TOTP disable error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
