import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";

export async function GET(req: Request) {
    try {
        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const category = searchParams.get("category") || "";
        const platform = searchParams.get("platform") || "";
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "12");
        const featured = searchParams.get("featured");

        const query: Record<string, unknown> = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        if (category) {
            query.category = category;
        }

        if (platform) {
            query.platform = platform;
        }

        if (featured === "true") {
            query.isFeatured = true;
        }

        const total = await Software.countDocuments(query);
        const software = await Software.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return NextResponse.json({
            software,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error("Software list error:", error);
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
        const body = await req.json();

        // Generate slug from name
        const slug = body.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

        const existingSlug = await Software.findOne({ slug });
        if (existingSlug) {
            return NextResponse.json(
                { error: "Software with this name already exists" },
                { status: 409 }
            );
        }

        const software = await Software.create({
            ...body,
            slug,
        });

        return NextResponse.json({ software }, { status: 201 });
    } catch (error) {
        console.error("Software create error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
