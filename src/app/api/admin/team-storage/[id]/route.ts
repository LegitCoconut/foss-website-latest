import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import User from "@/models/User";
import { deleteFile } from "@/lib/s3";
import bcrypt from "bcryptjs";

export async function GET(
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

        const team = await Team.findById(id)
            .populate("members", "name email")
            .lean();

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const [stats] = await TeamFile.aggregate([
            { $match: { teamId: team._id } },
            { $group: { _id: null, fileCount: { $sum: 1 }, totalStorageUsed: { $sum: "$fileSize" } } },
        ]);

        return NextResponse.json({
            team: {
                ...team,
                memberCount: team.members?.length || 0,
                fileCount: stats?.fileCount || 0,
                totalStorageUsed: stats?.totalStorageUsed || 0,
            },
        });
    } catch (error) {
        console.error("Team get error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(
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

        const team = await Team.findByIdAndUpdate(id, body, {
            returnDocument: "after",
            runValidators: true,
        }).populate("members", "name email");

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        return NextResponse.json({ team });
    } catch (error) {
        console.error("Team update error:", error);
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

        await dbConnect();

        const body = await req.json().catch(() => ({}));
        const { password, confirmText } = body as { password?: string; confirmText?: string };

        if (!password || !confirmText) {
            return NextResponse.json({ error: "Password and confirmation text required" }, { status: 400 });
        }

        const user = await User.findById(session.user.id).select("+password");
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json({ error: "Invalid password" }, { status: 401 });
        }

        const team = await Team.findById(id);
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const expectedConfirm = `delete ${team.name}`.toLowerCase();
        if (confirmText.trim().toLowerCase() !== expectedConfirm) {
            return NextResponse.json({ error: "Confirmation text does not match" }, { status: 400 });
        }

        // Delete all files from S3
        const files = await TeamFile.find({ teamId: team._id }).lean();
        await Promise.allSettled(
            files.map((f) => deleteFile(process.env.S3_FILES_BUCKET!, f.fileKey))
        );

        // Remove DB records
        await TeamFile.deleteMany({ teamId: team._id });
        await Team.findByIdAndDelete(id);

        return NextResponse.json({ message: "Team deleted" });
    } catch (error) {
        console.error("Team delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
