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

        // Delete file from S3
        try {
            await deleteFile(process.env.S3_FILES_BUCKET!, version.fileKey);
        } catch (e) {
            console.error("Failed to delete S3 file:", e);
        }

        await Software.updateOne(
            { _id: id },
            { $pull: { versions: { _id: versionId } } }
        );

        return NextResponse.json({ message: "Version deleted" });
    } catch (error) {
        console.error("Version delete error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
