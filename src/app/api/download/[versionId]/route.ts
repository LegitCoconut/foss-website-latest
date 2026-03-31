import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import DownloadLog from "@/models/DownloadLog";
import { getPresignedDownloadUrl } from "@/lib/s3";

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

        await DownloadLog.create({
            userId: session.user.id,
            softwareId: software._id,
            versionId: version._id,
            softwareName: software.name,
            versionNumber: version.versionNumber,
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
