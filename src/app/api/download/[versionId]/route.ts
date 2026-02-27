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

        // Generate presigned URL with 5-minute TTL
        const url = await getPresignedDownloadUrl(
            process.env.S3_FILES_BUCKET!,
            version.fileKey,
            300
        );

        // Log the download
        await DownloadLog.create({
            userId: session.user.id,
            softwareId: software._id,
            versionId: version._id,
            softwareName: software.name,
            versionNumber: version.versionNumber,
        });

        // Increment download counter
        await Software.updateOne(
            { _id: software._id },
            { $inc: { totalDownloads: 1 } }
        );

        return NextResponse.json({ url, fileName: version.fileName });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
