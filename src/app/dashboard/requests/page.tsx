"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MessageSquarePlus, Loader2, Calendar, ExternalLink } from "lucide-react";

interface RequestEntry {
    _id: string;
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

export default function RequestsPage() {
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetch("/api/requests")
            .then((r) => r.json())
            .then((data) => setRequests(data.requests || []))
            .finally(() => setLoading(false));
    }, []);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const url = formData.get("url") as string;

        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, url }),
            });

            if (!res.ok) {
                toast.error("Failed to submit request");
                return;
            }

            const data = await res.json();
            setRequests([data.request, ...requests]);
            toast.success("Request submitted!");
            (e.target as HTMLFormElement).reset();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Request Software</h1>
                <p className="text-muted-foreground">
                    Can&apos;t find what you need? Request it here
                </p>
            </div>

            {/* Submit form */}
            <Card className="border-white/10 bg-white/[0.03] mb-8">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-blue-400" />
                        New Request
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Software Name</Label>
                            <Input
                                id="title"
                                name="title"
                                placeholder="e.g., Blender 4.0"
                                required
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Why do you need it?</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe why this software would be useful..."
                                required
                                className="bg-white/5 border-white/10 min-h-[80px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="url">Project URL (optional)</Label>
                            <Input
                                id="url"
                                name="url"
                                placeholder="https://..."
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={submitting}
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        >
                            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Request
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Request List */}
            <h2 className="text-xl font-semibold mb-4">Your Requests</h2>
            <div className="space-y-3">
                {loading ? (
                    <p className="text-muted-foreground text-sm">Loading...</p>
                ) : requests.length === 0 ? (
                    <Card className="border-white/10 bg-white/[0.03]">
                        <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">No requests yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    requests.map((req) => (
                        <Card key={req._id} className="border-white/10 bg-white/[0.03]">
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-medium">{req.title}</h3>
                                            <Badge className={statusColors[req.status] || ""}>
                                                {req.status}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                                        {req.url && (
                                            <a
                                                href={req.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-1"
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                                Project Link
                                            </a>
                                        )}
                                        {req.adminNotes && (
                                            <>
                                                <Separator className="my-2 bg-white/10" />
                                                <p className="text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">Admin: </span>
                                                    {req.adminNotes}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
