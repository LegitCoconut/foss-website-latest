import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { encryptSecret, generateTotpSecret } from "@/lib/totp";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { secret, otpauthUrl, qrCodeDataUrl } = generateTotpSecret(
      session.user.email!
    );

    const encrypted = encryptSecret(secret);

    await User.findByIdAndUpdate(
      session.user.id,
      { totpSecret: encrypted },
      { returnDocument: "after" }
    );

    return NextResponse.json({ qrCodeDataUrl, manualSecret: secret });
  } catch (error) {
    console.error("TOTP setup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
