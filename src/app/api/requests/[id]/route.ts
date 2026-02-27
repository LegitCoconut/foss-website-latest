import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import dbConnect from "@/lib/db";
import SoftwareRequest from "@/models/SoftwareRequest";

export async function PATCH(
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

        const request = await SoftwareRequest.findByIdAndUpdate(
            id,
            {
                status: body.status,
                adminNotes: body.adminNotes,
            },
            { new: true }
        );

        if (!request) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        return NextResponse.json({ request });
    } catch (error) {
        console.error("Request update error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
