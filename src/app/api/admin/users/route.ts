import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import User from "@/models/User";

export async function GET(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status") || "";

        const query: Record<string, unknown> = { role: "user" };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { registerNumber: { $regex: search, $options: "i" } },
            ];
        }

        if (status) {
            query.status = status;
        }

        const users = await User.find(query)
            .select("name email registerNumber role status createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Users list error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await dbConnect();
        const body = await req.json();
        const { userId, action } = body;

        if (!userId || !action) {
            return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
        }

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Prevent self-suspension/deletion
        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
        }

        if (action === "suspend") {
            user.status = "suspended";
            await user.save();
            return NextResponse.json({ message: "User suspended", user: { _id: user._id, status: user.status } });
        }

        if (action === "activate") {
            user.status = "active";
            await user.save();
            return NextResponse.json({ message: "User activated", user: { _id: user._id, status: user.status } });
        }

        if (action === "delete") {
            await User.findByIdAndDelete(userId);
            return NextResponse.json({ message: "User deleted" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("User action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
