import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import DownloadLog from "@/models/DownloadLog";
import { getPresignedUploadUrl, deleteFile } from "@/lib/s3";
import crypto from "crypto";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const { teamId } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        if (!team.members.some((m) => m.toString() === session.user!.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        if (team.status === "suspended") {
            return NextResponse.json({ error: "Team is suspended — uploads are disabled" }, { status: 403 });
        }

        const { fileName, contentType, fileSize, description } = await req.json();

        if (!fileName || !fileSize) {
            return NextResponse.json({ error: "fileName and fileSize are required" }, { status: 400 });
        }

        // Check storage quota
        const [stats] = await TeamFile.aggregate([
            { $match: { teamId: team._id } },
            { $group: { _id: null, total: { $sum: "$fileSize" } } },
        ]);
        const currentUsed = stats?.total || 0;

        if (currentUsed + fileSize > team.storageLimit) {
            return NextResponse.json(
                { error: "Upload would exceed team storage limit" },
                { status: 400 }
            );
        }

        // Generate S3 key and presigned URL
        const ext = fileName.split(".").pop() || "";
        const key = `team-storage/${teamId}/${crypto.randomUUID()}.${ext}`;

        const uploadUrl = await getPresignedUploadUrl(
            process.env.S3_FILES_BUCKET!,
            key,
            contentType || "application/octet-stream",
            600
        );

        // Create file record
        const teamFile = await TeamFile.create({
            teamId: team._id,
            uploadedBy: session.user.id,
            fileKey: key,
            fileName,
            fileSize,
            contentType: contentType || "application/octet-stream",
            description: description || "",
        });

        // Log upload
        const forwarded = req.headers.get("x-forwarded-for");
        const rawIp = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "unknown";
        const ipAddress = rawIp.startsWith("::ffff:") ? rawIp.slice(7) : rawIp;

        await DownloadLog.create({
            userId: session.user.id,
            userName: session.user.name || "",
            userEmail: session.user.email || "",
            ipAddress,
            type: "team-upload",
            teamId: team._id,
            teamName: team.name,
            fileName,
        });

        return NextResponse.json({
            uploadUrl,
            key,
            fileName,
            fileId: teamFile._id,
        });
    } catch (error) {
        console.error("Team file upload error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ teamId: string }> }
) {
    try {
        const { teamId } = await params;
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        const team = await Team.findById(teamId);
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        if (!team.members.some((m) => m.toString() === session.user!.id)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { fileId } = await req.json();
        if (!fileId) {
            return NextResponse.json({ error: "fileId is required" }, { status: 400 });
        }

        const file = await TeamFile.findOne({ _id: fileId, teamId: team._id });
        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        if (file.uploadedBy.toString() !== session.user.id) {
            return NextResponse.json({ error: "You can only delete your own files" }, { status: 403 });
        }

        await deleteFile(process.env.S3_FILES_BUCKET!, file.fileKey);
        await TeamFile.findByIdAndDelete(fileId);

        return NextResponse.json({ message: "File deleted" });
    } catch (error) {
        console.error("Team file delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
