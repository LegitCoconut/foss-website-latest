import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];

// 60 image uploads per hour per admin
const limiter = rateLimit({ interval: 3600_000, limit: 60 });

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/upload/image", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: "Invalid file type. Allowed: JPEG, PNG, WebP, SVG, GIF" },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const ext = file.name.split(".").pop() || "png";
        const key = `images/${crypto.randomUUID()}.${ext}`;

        await uploadFile(
            process.env.S3_ASSETS_BUCKET!,
            key,
            buffer,
            file.type
        );

        return NextResponse.json({
            key,
            url: `${process.env.S3_ENDPOINT}/${process.env.S3_ASSETS_BUCKET}/${key}`,
        });
    } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
