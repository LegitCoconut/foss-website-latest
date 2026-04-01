import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { s3Client, deleteFile } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import dbConnect from "@/lib/db";
import Software from "@/models/Software";
import Team from "@/models/Team";
import TeamFile from "@/models/TeamFile";
import User from "@/models/User";
import bcrypt from "bcryptjs";

async function listBucket(bucket: string) {
    const files: { key: string; size: number; lastModified: string }[] = [];
    let continuationToken: string | undefined;

    do {
        const res = await s3Client.send(new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
        }));
        if (res.Contents) {
            for (const obj of res.Contents) {
                files.push({
                    key: obj.Key || "",
                    size: obj.Size || 0,
                    lastModified: obj.LastModified?.toISOString() || "",
                });
            }
        }
        continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return files;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const filesBucket = process.env.S3_FILES_BUCKET!;
        const assetsBucket = process.env.S3_ASSETS_BUCKET!;

        // 1. List both buckets in parallel
        const [rawFiles, rawAssets] = await Promise.all([
            listBucket(filesBucket),
            listBucket(assetsBucket),
        ]);

        // 2. Get all software data
        await dbConnect();
        const softwareList = await Software.find({})
            .select("name slug iconKey screenshotKeys versions")
            .lean();

        // 3. Build maps for file keys and asset keys
        const fileKeyMap = new Map<string, { softwareName: string; softwareId: string; detail: string }>();
        const assetKeyMap = new Map<string, { softwareName: string; softwareId: string; detail: string }>();

        for (const sw of softwareList) {
            const id = sw._id.toString();

            // Icon
            if (sw.iconKey) {
                assetKeyMap.set(sw.iconKey, { softwareName: sw.name, softwareId: id, detail: "Logo" });
            }

            // Screenshots
            for (const key of sw.screenshotKeys || []) {
                assetKeyMap.set(key, { softwareName: sw.name, softwareId: id, detail: "Screenshot" });
            }

            // Version files
            for (const v of sw.versions || []) {
                if (v.files && v.files.length > 0) {
                    for (const f of v.files) {
                        if (f.fileKey) {
                            fileKeyMap.set(f.fileKey, { softwareName: sw.name, softwareId: id, detail: `v${v.versionNumber}` });
                        }
                    }
                }
                if (v.fileKey) {
                    fileKeyMap.set(v.fileKey, { softwareName: sw.name, softwareId: id, detail: `v${v.versionNumber}` });
                }
            }
        }

        // 3b. Build map for team storage file keys
        const teamFiles = await TeamFile.find({}).select("fileKey teamId").lean();
        const teamIds = [...new Set(teamFiles.map((tf) => tf.teamId.toString()))];
        const teams = await Team.find({ _id: { $in: teamIds } }).select("name").lean();
        const teamNameMap = new Map(teams.map((t) => [t._id.toString(), t.name]));

        for (const tf of teamFiles) {
            const teamName = teamNameMap.get(tf.teamId.toString()) || "Unknown Team";
            fileKeyMap.set(tf.fileKey, { softwareName: teamName, softwareId: "", detail: "Team Storage" });
        }

        // 4. Enrich files
        const files = rawFiles.map((f) => {
            const linked = fileKeyMap.get(f.key);
            return {
                ...f,
                bucket: "files" as const,
                isOrphan: !linked,
                softwareName: linked?.softwareName || null,
                softwareId: linked?.softwareId || null,
                detail: linked?.detail || null,
            };
        });

        const assets = rawAssets.map((f) => {
            const linked = assetKeyMap.get(f.key);
            return {
                ...f,
                bucket: "assets" as const,
                isOrphan: !linked,
                softwareName: linked?.softwareName || null,
                softwareId: linked?.softwareId || null,
                detail: linked?.detail || null,
            };
        });

        const allItems = [...files, ...assets];
        const totalSize = allItems.reduce((sum, f) => sum + f.size, 0);
        const orphanCount = allItems.filter((f) => f.isOrphan).length;

        return NextResponse.json({
            files: allItems,
            summary: {
                totalFiles: allItems.length,
                totalSize,
                orphanCount,
                linkedCount: allItems.length - orphanCount,
                filesBucketCount: files.length,
                filesBucketSize: rawFiles.reduce((sum, f) => sum + f.size, 0),
                assetsBucketCount: assets.length,
                assetsBucketSize: rawAssets.reduce((sum, f) => sum + f.size, 0),
            },
        });
    } catch (error) {
        console.error("Bucket list error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { key, bucket, isOrphan, password, confirmText, softwareName } = body;

        if (!key || !bucket) {
            return NextResponse.json({ error: "key and bucket are required" }, { status: 400 });
        }

        // For non-orphan files, require password + confirmation text
        if (!isOrphan) {
            if (!password || !confirmText) {
                return NextResponse.json({ error: "Password and confirmation text required" }, { status: 400 });
            }

            const expectedText = `delete ${softwareName} upload`;
            if (confirmText.trim().toLowerCase() !== expectedText.toLowerCase()) {
                return NextResponse.json({ error: `Please type: ${expectedText}` }, { status: 400 });
            }

            // Verify admin password
            await dbConnect();
            const user = await User.findById(session.user.id).select("+password");
            if (!user) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) {
                return NextResponse.json({ error: "Invalid password" }, { status: 401 });
            }
        }

        const bucketName = bucket === "files"
            ? process.env.S3_FILES_BUCKET!
            : process.env.S3_ASSETS_BUCKET!;

        await deleteFile(bucketName, key);

        return NextResponse.json({ message: "File deleted" });
    } catch (error) {
        console.error("Bucket delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
