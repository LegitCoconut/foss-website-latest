import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { s3Client } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import os from "os";
import { execFileSync } from "child_process";

function getCpuUsage(): Promise<number> {
    const cpus = os.cpus();
    const start = cpus.map((cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return { idle: cpu.times.idle, total };
    });

    return new Promise((resolve) => {
        setTimeout(() => {
            const cpusNow = os.cpus();
            let idleDiff = 0;
            let totalDiff = 0;
            cpusNow.forEach((cpu, i) => {
                const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
                totalDiff += total - start[i].total;
                idleDiff += cpu.times.idle - start[i].idle;
            });
            const usage = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;
            resolve(Math.round(usage * 10) / 10);
        }, 500);
    });
}

function getDiskUsage(): { total: number; used: number; available: number } {
    try {
        const output = execFileSync("df", ["-B1", "/"]).toString().trim();
        const lines = output.split("\n");
        const parts = lines[lines.length - 1].split(/\s+/);
        return {
            total: parseInt(parts[1]) || 0,
            used: parseInt(parts[2]) || 0,
            available: parseInt(parts[3]) || 0,
        };
    } catch {
        return { total: 0, used: 0, available: 0 };
    }
}

function getDockerStorageUsage(): { name: string; size: string }[] {
    try {
        const output = execFileSync("docker", [
            "system", "df", "--format", "{{.Type}}|{{.Size}}|{{.Reclaimable}}",
        ]).toString().trim();
        if (!output) return [];
        return output.split("\n").map((line) => {
            const [type, size] = line.split("|");
            return { name: type, size };
        });
    } catch {
        return [];
    }
}

async function getBucketSize(bucket: string): Promise<number> {
    let totalSize = 0;
    let continuationToken: string | undefined;
    try {
        do {
            const res = await s3Client.send(new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: continuationToken,
            }));
            if (res.Contents) {
                for (const obj of res.Contents) {
                    totalSize += obj.Size || 0;
                }
            }
            continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (continuationToken);
    } catch {
        // bucket may not exist
    }
    return totalSize;
}

async function getS3StorageUsage(): Promise<{ files: number; assets: number; total: number }> {
    const [files, assets] = await Promise.all([
        getBucketSize(process.env.S3_FILES_BUCKET || "foss-files"),
        getBucketSize(process.env.S3_ASSETS_BUCKET || "foss-assets"),
    ]);
    return { files, assets, total: files + assets };
}

function getNetworkStats(): { rx: number; tx: number; interface: string } {
    try {
        const interfaces = os.networkInterfaces();
        let primaryIface = "";
        for (const [name, addrs] of Object.entries(interfaces)) {
            if (name === "lo") continue;
            if (addrs?.some((a) => a.family === "IPv4" && !a.internal)) {
                primaryIface = name;
                break;
            }
        }
        if (!primaryIface) return { rx: 0, tx: 0, interface: "unknown" };

        const rxPath = `/sys/class/net/${primaryIface}/statistics/rx_bytes`;
        const txPath = `/sys/class/net/${primaryIface}/statistics/tx_bytes`;
        const rx = parseInt(execFileSync("cat", [rxPath]).toString().trim()) || 0;
        const tx = parseInt(execFileSync("cat", [txPath]).toString().trim()) || 0;
        return { rx, tx, interface: primaryIface };
    } catch {
        return { rx: 0, tx: 0, interface: "unknown" };
    }
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user || (session.user as { role?: string }).role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const [cpuUsage, s3Usage] = await Promise.all([
            getCpuUsage(),
            getS3StorageUsage(),
        ]);

        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const disk = getDiskUsage();
        const dockerStorage = getDockerStorageUsage();
        const network = getNetworkStats();

        return NextResponse.json({
            cpu: {
                usage: cpuUsage,
                cores: os.cpus().length,
                model: os.cpus()[0]?.model || "Unknown",
            },
            memory: {
                total: totalMem,
                used: usedMem,
                free: freeMem,
                usagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
            },
            disk: {
                total: disk.total,
                used: disk.used,
                available: disk.available,
                usagePercent: disk.total > 0 ? Math.round((disk.used / disk.total) * 1000) / 10 : 0,
            },
            storage: {
                s3: {
                    files: s3Usage.files,
                    assets: s3Usage.assets,
                    total: s3Usage.total,
                },
                docker: dockerStorage,
            },
            network: {
                interface: network.interface,
                rxBytes: network.rx,
                txBytes: network.tx,
            },
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                arch: os.arch(),
                uptime: os.uptime(),
            },
        });
    } catch (error) {
        console.error("System stats error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
