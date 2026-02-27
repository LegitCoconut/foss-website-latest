"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    MessageSquare,
    Calendar,
    ExternalLink,
    Check,
    X,
    CheckCircle,
    User,
} from "lucide-react";

interface RequestEntry {
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    title: string;
    description: string;
    url: string;
    status: string;
    adminNotes: string;
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    completed: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const params = filter !== "all" ? `?status=${filter}` : "";
        fetch(`/api/requests${params}`)
            .then((r) => r.json())
            .then((data) => setRequests(data.requests || []))
            .finally(() => setLoading(false));
    }, [filter]);

    async function updateStatus(id: string, status: string, adminNotes?: string) {
        try {
            const res = await fetch(`/api/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status, adminNotes }),
            });

            if (res.ok) {
                setRequests(
                    requests.map((r) => (r._id === id ? { ...r, status, adminNotes: adminNotes || r.adminNotes } : r))
                );
                toast.success(`Request ${status}`);
            } else {
                toast.error("Update failed");
            }
        } catch {
            toast.error("Something went wrong");
        }
    }

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Software Requests</h1>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-40 bg-white/5 border-white/10">
                        <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-32" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.03]">
                    <CardContent className="p-12 text-center">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground">No requests found</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {requests.map((req) => (
                        <Card key={req._id} className="border-white/10 bg-white/[0.03]">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold">{req.title}</h3>
                                            <Badge className={statusColors[req.status] || ""}>{req.status}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" />
                                                {req.userName || "Unknown"} ({req.userEmail || ""})
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(req.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    {req.status === "pending" && (
                                        <div className="flex gap-1 flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateStatus(req._id, "approved")}
                                                className="text-green-400 hover:text-green-300"
                                            >
                                                <Check className="h-4 w-4 mr-1" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateStatus(req._id, "rejected")}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => updateStatus(req._id, "completed")}
                                                className="text-blue-400 hover:text-blue-300"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-1" />
                                                Done
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-sm text-muted-foreground mb-2">{req.description}</p>

                                {req.url && (
                                    <a
                                        href={req.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Project Link
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
