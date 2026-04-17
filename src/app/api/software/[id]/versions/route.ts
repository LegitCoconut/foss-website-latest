import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import User from "@/models/User";
import { deleteFile, getFileChecksum } from "@/lib/s3";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const limiter = rateLimit({ interval: 3600_000, limit: 120 });

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/software/[id]/versions", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();
        const body = await req.json();

        const software = await Software.findById(id);
        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        // Compute checksums server-side for files missing them
        const bucket = process.env.S3_FILES_BUCKET!;
        if (body.files && Array.isArray(body.files)) {
            for (const file of body.files) {
                if (!file.checksum && file.fileKey) {
                    try {
                        file.checksum = await getFileChecksum(bucket, file.fileKey);
                    } catch (e) {
                        console.error("Checksum computation failed for", file.fileKey, e);
                    }
                }
            }
        }
        // Legacy single-file
        if (!body.checksum && body.fileKey) {
            try {
                body.checksum = await getFileChecksum(bucket, body.fileKey);
            } catch (e) {
                console.error("Checksum computation failed for", body.fileKey, e);
            }
        }

        software.versions.push(body);
        software.markModified("versions");
        await software.save();

        const newVersion = software.versions[software.versions.length - 1];

        return NextResponse.json({ version: newVersion }, { status: 201 });
    } catch (error) {
        console.error("Version create error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/software/[id]/versions", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();
        const body = await req.json();
        const { versionId, files: newFiles, removeFileIds, versionNumber, releaseNotes, password, confirmText } = body;

        if (!versionId) {
            return NextResponse.json({ error: "versionId is required" }, { status: 400 });
        }

        const software = await Software.findById(id);
        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        const version = software.versions.find((v) => v._id.toString() === versionId);
        if (!version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Update basic fields if provided
        if (versionNumber !== undefined) version.versionNumber = versionNumber;
        if (releaseNotes !== undefined) version.releaseNotes = releaseNotes;

        // Remove files by ID — requires password verification
        if (removeFileIds && Array.isArray(removeFileIds) && removeFileIds.length > 0) {
            if (!password || !confirmText) {
                return NextResponse.json({ error: "Password and confirmation required to delete files" }, { status: 400 });
            }
            const expectedText = `delete ${software.name} file`.toLowerCase();
            if (confirmText.trim().toLowerCase() !== expectedText) {
                return NextResponse.json({ error: `Please type: delete ${software.name} file` }, { status: 400 });
            }
            const user = await User.findById(session.user.id).select("+password");
            if (!user || !(await bcrypt.compare(password, user.password))) {
                return NextResponse.json({ error: "Invalid password" }, { status: 401 });
            }

            const bucket = process.env.S3_FILES_BUCKET!;
            for (const fileId of removeFileIds) {
                const file = version.files?.find((f) => f._id.toString() === fileId);
                if (file) {
                    try {
                        await deleteFile(bucket, file.fileKey);
                    } catch (e) {
                        console.error("Failed to delete S3 file:", e);
                    }
                }
            }
            if (version.files) {
                version.files = version.files.filter(
                    (f) => !removeFileIds.includes(f._id.toString())
                ) as typeof version.files;
            }
        }

        // Add new files
        if (newFiles && Array.isArray(newFiles) && newFiles.length > 0) {
            const bucket = process.env.S3_FILES_BUCKET!;
            for (const file of newFiles) {
                if (!file.checksum && file.fileKey) {
                    try {
                        file.checksum = await getFileChecksum(bucket, file.fileKey);
                    } catch (e) {
                        console.error("Checksum failed for", file.fileKey, e);
                    }
                }
            }
            if (!version.files) {
                version.files = [] as typeof version.files;
            }
            version.files.push(...newFiles);
        }

        software.markModified("versions");
        await software.save();

        const updated = software.versions.find((v) => v._id.toString() === versionId);
        return NextResponse.json({ version: updated });
    } catch (error) {
        console.error("Version update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/software/[id]/versions", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        const { searchParams } = new URL(req.url);
        const versionId = searchParams.get("versionId");

        if (!versionId) {
            return NextResponse.json({ error: "versionId is required" }, { status: 400 });
        }

        await dbConnect();
        const software = await Software.findById(id);
        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        const version = software.versions.find(
            (v) => v._id.toString() === versionId
        );
        if (!version) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // Delete files from S3
        const fileKeys = version.files && version.files.length > 0
            ? version.files.map((f) => f.fileKey)
            : version.fileKey ? [version.fileKey] : [];
        for (const fk of fileKeys) {
            try {
                await deleteFile(process.env.S3_FILES_BUCKET!, fk);
            } catch (e) {
                console.error("Failed to delete S3 file:", e);
            }
        }

        // Soft-delete: mark version as deleted instead of removing
        version.isDeleted = true;
        software.markModified("versions");

        // If this was the default version, clear the default
        if (software.defaultVersionId === versionId) {
            software.defaultVersionId = "";
        }

        await software.save();

        return NextResponse.json({ message: "Version deleted" });
    } catch (error) {
        console.error("Version delete error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
