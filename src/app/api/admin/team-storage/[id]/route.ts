import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import User from "@/models/User";
import { deleteFile } from "@/lib/s3";
import { SYSTEM_MAX_FILE_SIZE, MIN_TEAM_MAX_FILE_SIZE } from "@/lib/team-storage-config";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import bcrypt from "bcryptjs";

const readLimiter = rateLimit({ interval: 60_000, limit: 60 });
const writeLimiter = rateLimit({ interval: 3600_000, limit: 120 });

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

        const rl = readLimiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/admin/team-storage/[id]", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

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

        const rl = writeLimiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/admin/team-storage/[id]", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

        await dbConnect();
        const body = await req.json();

        // Explicit allowlist of updatable fields
        const allowed = ["name", "description", "storageLimit", "maxFileSize", "status"];
        const updates: Record<string, unknown> = {};
        for (const k of allowed) {
            if (k in body) updates[k] = body[k];
        }

        // Validate maxFileSize: null clears override, otherwise must be within bounds
        if ("maxFileSize" in updates) {
            const v = updates.maxFileSize;
            if (v === null || v === undefined || v === 0) {
                updates.maxFileSize = null; // clear override
            } else if (typeof v !== "number" || !Number.isFinite(v) || v < MIN_TEAM_MAX_FILE_SIZE || v > SYSTEM_MAX_FILE_SIZE) {
                return NextResponse.json(
                    { error: `maxFileSize must be between ${MIN_TEAM_MAX_FILE_SIZE} and ${SYSTEM_MAX_FILE_SIZE} bytes, or null` },
                    { status: 400 }
                );
            }
        }

        const team = await Team.findByIdAndUpdate(id, updates, {
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

        const rl = writeLimiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset, { req: req, path: "/api/admin/team-storage/[id]", userId: session?.user?.id, userName: session?.user?.name, userEmail: session?.user?.email });

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
