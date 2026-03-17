import { NextResponse } from "next/server";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ key: string[] }> }
) {
    try {
        const { key } = await params;
        const objectKey = key.join("/");

        const command = new GetObjectCommand({
            Bucket: process.env.S3_ASSETS_BUCKET!,
            Key: objectKey,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const bytes = await response.Body.transformToByteArray();

        return new NextResponse(Buffer.from(bytes), {
            headers: {
                "Content-Type": response.ContentType || "application/octet-stream",
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });
    } catch (error: unknown) {
        const code = (error as { name?: string })?.name;
        if (code === "NoSuchKey") {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        console.error("Asset proxy error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
