import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/s3";
import crypto from "crypto";

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique key
        const ext = file.name.split(".").pop() || "";
        const key = `software/${crypto.randomUUID()}.${ext}`;

        // Calculate SHA256 checksum
        const hash = crypto.createHash("sha256").update(buffer).digest("hex");

        await uploadFile(
            process.env.S3_FILES_BUCKET!,
            key,
            buffer,
            file.type || "application/octet-stream"
        );

        return NextResponse.json({
            key,
            fileName: file.name,
            fileSize: buffer.length,
            checksum: hash,
            contentType: file.type,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
