import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import { deleteFile } from "@/lib/s3";

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

        await dbConnect();
        const body = await req.json();

        const software = await Software.findById(id);
        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        software.versions.push(body);
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
