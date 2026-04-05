import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import DownloadLog from "@/models/DownloadLog";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 3600_000, limit: 100 }); // 100 downloads per hour per user

export async function GET(
    req: Request,
    { params }: { params: Promise<{ versionId: string }> }
) {
    try {
        const { versionId } = await params;
        const session = await auth();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { success, reset } = limiter.check(session.user.id);
        if (!success) return rateLimitResponse(reset);

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get("fileId");

        const software = await Software.findOne({ "versions._id": versionId });
        if (!software) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        const version = software.versions.find(
            (v) => v._id.toString() === versionId
        );
        if (!version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        let fileKey: string;
        let fileName: string;

        // If version has files array, use it; otherwise fall back to legacy fields
        if (version.files && version.files.length > 0) {
            if (fileId) {
                const file = version.files.find((f) => f._id.toString() === fileId);
                if (!file) {
                    return NextResponse.json({ error: "File not found" }, { status: 404 });
                }
                fileKey = file.fileKey;
                fileName = file.fileName;
            } else {
                // Default to first file
                fileKey = version.files[0].fileKey;
                fileName = version.files[0].fileName;
            }
        } else {
            // Legacy single-file version
            fileKey = version.fileKey;
            fileName = version.fileName;
        }

        if (!fileKey) {
            return NextResponse.json({ error: "No file available" }, { status: 404 });
        }

        const url = await getPresignedDownloadUrl(
            process.env.S3_FILES_BUCKET!,
            fileKey,
            300
        );

        // Get IP address from headers, normalize IPv6-mapped IPv4 (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
        const forwarded = req.headers.get("x-forwarded-for");
        const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
        const ipAddress = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

        await DownloadLog.create({
            userId: session.user.id,
            userName: session.user.name || "",
            userEmail: session.user.email || "",
            ipAddress,
            softwareId: software._id,
            versionId: version._id,
            softwareName: software.name,
            versionNumber: version.versionNumber,
            fileName,
        });

        await Software.updateOne(
            { _id: software._id },
            { $inc: { totalDownloads: 1 } }
        );

        return NextResponse.json({ url, fileName });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
