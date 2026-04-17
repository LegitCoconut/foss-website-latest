import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPresignedUploadUrl } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

// 120 presigned URL requests per hour per admin (generous; legit bulk uploads OK)
const limiter = rateLimit({ interval: 3600_000, limit: 120 });

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/upload", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const body = await req.json();
        const { fileName, contentType } = body;

        if (!fileName) {
            return NextResponse.json({ error: "fileName is required" }, { status: 400 });
        }

        // Generate unique key
        const ext = fileName.split(".").pop() || "";
        const key = `software/${crypto.randomUUID()}.${ext}`;

        // Generate presigned PUT URL for direct upload to S3
        const uploadUrl = await getPresignedUploadUrl(
            process.env.S3_FILES_BUCKET!,
            key,
            contentType || "application/octet-stream",
            600 // 10 minutes
        );

        return NextResponse.json({
            uploadUrl,
            key,
            fileName,
        });
    } catch (error) {
        console.error("Upload presign error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
