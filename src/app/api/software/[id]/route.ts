import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import User from "@/models/User";
import { deleteFile } from "@/lib/s3";
import bcrypt from "bcryptjs";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const getLimiter = rateLimit({ interval: 60_000, limit: 60 });

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const ip = getClientIp(req);
        const { success, reset } = getLimiter.check(ip);
        if (!success) return rateLimitResponse(reset, { req, path: "/api/software/[id]" });

        await dbConnect();

        // Support lookup by either _id or slug
        const software = await Software.findOne({
            $or: [
                ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : []),
                { slug: id },
            ],
        }).lean();

        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        const session = await auth();
        const isAdmin = session?.user && (session.user as { role?: string }).role === "admin";

        // If the software is a draft, only allow admins to view it
        if ((software as { status?: string }).status === "draft" && !isAdmin) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        // Filter out deleted versions for non-admin users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sw = software as any;
        if (!isAdmin && Array.isArray(sw.versions)) {
            sw.versions = sw.versions.filter((v: { isDeleted?: boolean }) => !v.isDeleted);
        }

        return NextResponse.json({ software });
    } catch (error) {
        console.error("Software get error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
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

        const software = await Software.findByIdAndUpdate(id, body, {
            returnDocument: "after",
            runValidators: true,
        });

        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        return NextResponse.json({ software });
    } catch (error) {
        console.error("Software update error:", error);
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

        await dbConnect();

        // Verify admin password and confirmation text
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

        const software = await Software.findById(id);

        if (!software) {
            return NextResponse.json({ error: "Software not found" }, { status: 404 });
        }

        const expectedText = `delete ${software.name}`.toLowerCase();
        if (confirmText.trim().toLowerCase() !== expectedText) {
            return NextResponse.json({ error: `Please type: delete ${software.name}` }, { status: 400 });
        }

        // Delete all S3 files
        const deletePromises: Promise<unknown>[] = [];
        if (software.iconKey) {
            deletePromises.push(
                deleteFile(process.env.S3_ASSETS_BUCKET!, software.iconKey)
            );
        }
        for (const key of software.screenshotKeys) {
            deletePromises.push(
                deleteFile(process.env.S3_ASSETS_BUCKET!, key)
            );
        }
        for (const version of software.versions) {
            deletePromises.push(
                deleteFile(process.env.S3_FILES_BUCKET!, version.fileKey)
            );
        }
        await Promise.allSettled(deletePromises);

        await Software.findByIdAndDelete(id);

        return NextResponse.json({ message: "Software deleted" });
    } catch (error) {
        console.error("Software delete error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
