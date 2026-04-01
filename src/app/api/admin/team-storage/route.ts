import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const teams = await Team.find()
            .populate("members", "name email")
            .sort({ createdAt: -1 })
            .lean();

        // Aggregate file stats per team
        const fileStats = await TeamFile.aggregate([
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
        console.error("Team list error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();
        const { name, description, storageLimit } = await req.json();

        if (!name || !storageLimit) {
            return NextResponse.json(
                { error: "Name and storage limit are required" },
                { status: 400 }
            );
        }

        const team = await Team.create({
            name,
            description: description || "",
            storageLimit,
            members: [],
            status: "active",
        });

        return NextResponse.json({ team }, { status: 201 });
    } catch (error) {
        console.error("Team create error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
