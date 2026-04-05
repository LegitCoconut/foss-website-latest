import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000, limit: 30 });

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const rl = limiter.check(session.user.id);
        if (!rl.success) return rateLimitResponse(rl.reset);

        await dbConnect();

        const teams = await Team.find({ members: session.user.id })
            .populate("members", "name email")
            .sort({ createdAt: -1 })
            .lean();

        // Aggregate file stats per team
        const teamIds = teams.map((t) => t._id);
        const fileStats = await TeamFile.aggregate([
            { $match: { teamId: { $in: teamIds } } },
            {
                $group: {
                    _id: "$teamId",
                    fileCount: { $sum: 1 },
                    totalStorageUsed: { $sum: "$fileSize" },
                },
            },
        ]);

        const statsMap = new Map(
            fileStats.map((s) => [s._id.toString(), s])
        );

        const enrichedTeams = teams.map((team) => {
            const stats = statsMap.get(team._id.toString());
            return {
                ...team,
                memberCount: team.members?.length || 0,
                fileCount: stats?.fileCount || 0,
                totalStorageUsed: stats?.totalStorageUsed || 0,
            };
        });

        return NextResponse.json({ teams: enrichedTeams });
    } catch (error) {
        console.error("User teams list error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
