"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Calendar, Package, FolderArchive, Upload, ArrowDown } from "lucide-react";

interface DownloadEntry {
    _id: string;
    type: "software" | "team-upload" | "team-download";
    softwareName: string;
    versionNumber: string;
    softwareId: string;
    teamName: string;
    fileName: string;
    createdAt: string;
}

export default function DownloadsPage() {
    const [downloads, setDownloads] = useState<DownloadEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/downloads")
            .then((r) => r.json())
            .then((data) => setDownloads(data.downloads || []))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Downloads</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Your download history
                </p>
            </div>

            <Card className="border-border/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Download History
                        {!loading && (
                            <Badge variant="secondary" className="text-xs ml-auto">
                                {downloads.length} total
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : downloads.length === 0 ? (
                        <div className="text-center py-10">
                            <Package className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-sm text-muted-foreground">No downloads yet</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Browse the catalog to find software to download
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {downloads.map((dl) => (
                                    <TableRow key={dl._id}>
                                        <TableCell>
                                            {dl.type === "software" || !dl.type ? (
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                    <span className="font-medium">{dl.softwareName}</span>
                                                    {dl.versionNumber && (
                                                        <Badge variant="outline" className="font-mono text-[10px]">v{dl.versionNumber}</Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <FolderArchive className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="font-medium">{dl.teamName}</span>
                                                        {dl.fileName && (
                                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{dl.fileName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {dl.type === "team-upload" ? (
                                                <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                                                    <Upload className="h-2.5 w-2.5 mr-1" />
                                                    Upload
                                                </Badge>
                                            ) : dl.type === "team-download" ? (
                                                <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                                                    <ArrowDown className="h-2.5 w-2.5 mr-1" />
                                                    Download
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Download className="h-2.5 w-2.5 mr-1" />
                                                    Software
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {new Date(dl.createdAt).toLocaleDateString()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
