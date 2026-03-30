import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Software from "@/models/Software";
import DownloadLog from "@/models/DownloadLog";
import SoftwareRequest from "@/models/SoftwareRequest";
import PageVisit from "@/models/PageVisit";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(todayStart);
        monthStart.setDate(monthStart.getDate() - 30);

        const [
            totalUsers,
            totalSoftware,
            pendingRequests,
            totalDownloads,
            downloadsToday,
            downloadsThisWeek,
            downloadsThisMonth,
        ] = await Promise.all([
            User.countDocuments(),
            Software.countDocuments(),
            SoftwareRequest.countDocuments({ status: "pending" }),
            DownloadLog.countDocuments(),
            DownloadLog.countDocuments({ createdAt: { $gte: todayStart } }),
            DownloadLog.countDocuments({ createdAt: { $gte: weekStart } }),
            DownloadLog.countDocuments({ createdAt: { $gte: monthStart } }),
        ]);

        // Top downloaded software
        const topSoftwareAgg = await DownloadLog.aggregate([
            {
                $group: {
                    _id: "$softwareName",
                    downloads: { $sum: 1 },
                },
            },
            { $sort: { downloads: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, name: "$_id", downloads: 1 } },
        ]);

        // Recent downloads
        const recentDownloads = await DownloadLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate("userId", "name")
            .lean();

        const recentFormatted = recentDownloads.map((d) => ({
            softwareName: d.softwareName,
            versionNumber: d.versionNumber,
            userName: (d.userId as unknown as { name: string })?.name || "Unknown",
            createdAt: d.createdAt.toISOString(),
        }));

        // Downloads over last 30 days
        const downloadsOverTime = await DownloadLog.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1 } },
        ]);

        // Page visits over last 30 days
        const pageVisitsOverTime = await PageVisit.aggregate([
            { $match: { createdAt: { $gte: monthStart } } },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: "$_id", count: 1 } },
        ]);

        // Page visits per software (aggregate /catalog/{slug} visits)
        const softwarePageVisits = await PageVisit.aggregate([
            {
                $match: {
                    path: { $regex: "^/catalog/[^/]+$" },
                },
            },
            {
                $group: {
                    _id: { $arrayElemAt: [{ $split: ["$path", "/catalog/"] }, 1] },
                    visits: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: "softwares",
                    localField: "_id",
                    foreignField: "slug",
                    as: "software",
                },
            },
            { $unwind: { path: "$software", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    slug: "$_id",
                    name: { $ifNull: ["$software.name", "$_id"] },
                    visits: 1,
                },
            },
            { $sort: { visits: -1 } },
            { $limit: 20 },
        ]);

        return NextResponse.json({
            totalUsers,
            totalDownloads,
            totalSoftware,
            pendingRequests,
            downloadsToday,
            downloadsThisWeek,
            downloadsThisMonth,
            topSoftware: topSoftwareAgg,
            recentDownloads: recentFormatted,
            downloadsOverTime,
            pageVisitsOverTime,
            softwarePageVisits,
        });
    } catch (error) {
        console.error("Analytics error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
