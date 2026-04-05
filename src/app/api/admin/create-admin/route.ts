import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { auth } from "@/lib/auth";

const createAdminSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const admins = await User.find({ role: "admin" })
            .select("name email status createdAt")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ admins });
    } catch (error) {
        console.error("List admins error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const { userId, newPassword } = body;

        if (!userId || !newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        await dbConnect();

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const user = await User.findByIdAndUpdate(userId, { password: hashedPassword }, { returnDocument: "after" });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("Change password error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const body = await req.json();
        const validation = createAdminSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { name, email, password } = validation.data;

        await dbConnect();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: "An account with this email already exists" },
                { status: 409 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: "admin",
        });

        return NextResponse.json(
            {
                message: "Admin account created successfully",
                user: { id: user._id, name: user.name, email: user.email },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Create admin error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        await dbConnect();
        const { userId, action, password } = await req.json();

        if (!userId || !action) {
            return NextResponse.json({ error: "userId and action are required" }, { status: 400 });
        }

        if (userId === session.user.id) {
            return NextResponse.json({ error: "Cannot modify your own account" }, { status: 400 });
        }

        const targetAdmin = await User.findById(userId);
        if (!targetAdmin || targetAdmin.role !== "admin") {
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        if (action === "suspend") {
            targetAdmin.status = "suspended";
            await targetAdmin.save();
            return NextResponse.json({ message: "Admin suspended" });
        }

        if (action === "activate") {
            targetAdmin.status = "active";
            await targetAdmin.save();
            return NextResponse.json({ message: "Admin activated" });
        }

        if (action === "delete") {
            if (!password) {
                return NextResponse.json({ error: "Password is required to delete an admin" }, { status: 400 });
            }

            const currentAdmin = await User.findById(session.user.id).select("+password");
            if (!currentAdmin) {
                return NextResponse.json({ error: "Current user not found" }, { status: 404 });
            }

            const valid = await bcrypt.compare(password, currentAdmin.password);
            if (!valid) {
                return NextResponse.json({ error: "Invalid password" }, { status: 401 });
            }

            await User.findByIdAndDelete(userId);
            return NextResponse.json({ message: "Admin deleted" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Admin action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
