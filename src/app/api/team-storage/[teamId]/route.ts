import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";

export async function GET(
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

        const team = await Team.findById(teamId)
            .populate("members", "name email")
            .lean();

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Verify membership
        const isMember = team.members.some(
            (m: { _id: { toString(): string } }) => m._id.toString() === session.user!.id
        );
        if (!isMember) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const files = await TeamFile.find({ teamId: team._id })
            .populate("uploadedBy", "name email")
            .sort({ createdAt: -1 })
            .lean();

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
            files,
        });
    } catch (error) {
        console.error("Team detail error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
