"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

import { toast } from "sonner";
import {
    Loader2,
    Calendar,
    ExternalLink,
    Download,
    Upload,
    Github,
    ArrowLeft,
    MessageCircle,
    ChevronDown,
} from "lucide-react";

interface RequestEntry {
    _id: string;
    type: string;
    title: string;
    description: string;
    url: string;
    status: string;
    adminNotes: string;
    createdAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "outline",
    approved: "secondary",
    rejected: "destructive",
    completed: "default",
};

const typeLabels: Record<string, string> = {
    "software-request": "Software Request",
    "submit-software": "Software Submission",
    "showcase-repo": "Repository Showcase",
};

const typeColors: Record<string, string> = {
    "software-request": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "submit-software": "bg-green-500/10 text-green-400 border-green-500/20",
    "showcase-repo": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

type RequestType = "software-request" | "submit-software" | "showcase-repo";

const requestTypes: { value: RequestType; label: string; description: string; icon: React.ElementType }[] = [
    {
        value: "software-request",
        label: "Request Software",
        description: "Ask us to add a software to the platform",
        icon: Download,
    },
    {
        value: "submit-software",
        label: "Submit Your Software",
        description: "Submit your own software to be listed on the portal",
        icon: Upload,
    },
    {
        value: "showcase-repo",
        label: "Showcase a Repository",
        description: "Suggest a GitHub or open-source repo to be featured",
        icon: Github,
    },
];

const formConfig: Record<RequestType, {
    titleLabel: string;
    titlePlaceholder: string;
    descLabel: string;
    descPlaceholder: string;
    urlLabel: string;
    urlPlaceholder: string;
    urlRequired: boolean;
}> = {
    "software-request": {
        titleLabel: "Software Name",
        titlePlaceholder: "e.g., Blender 4.0",
        descLabel: "Why do you need it?",
        descPlaceholder: "Describe why this software would be useful for the community...",
        urlLabel: "Project Website (optional)",
        urlPlaceholder: "https://www.blender.org",
        urlRequired: false,
    },
    "submit-software": {
        titleLabel: "Software Name",
        titlePlaceholder: "e.g., My Awesome Tool",
        descLabel: "Tell us about your software",
        descPlaceholder: "What does it do? What platforms does it support? What license is it under?",
        urlLabel: "Download / Website URL",
        urlPlaceholder: "https://github.com/you/your-project",
        urlRequired: true,
    },
    "showcase-repo": {
        titleLabel: "Repository Name",
        titlePlaceholder: "e.g., torvalds/linux",
        descLabel: "Why should it be showcased?",
        descPlaceholder: "What makes this repo notable? Why would others find it useful?",
        urlLabel: "Repository URL",
        urlPlaceholder: "https://github.com/...",
        urlRequired: true,
    },
};

export default function RequestsPage() {
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [selectedType, setSelectedType] = useState<RequestType | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/requests")
            .then((r) => r.json())
            .then((data) => setRequests(data.requests || []))
            .finally(() => setLoading(false));
    }, []);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!selectedType) return;
        setSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: selectedType,
                    title: formData.get("title"),
                    description: formData.get("description"),
                    url: formData.get("url"),
                }),
            });

            if (!res.ok) {
                toast.error("Failed to submit request");
                return;
            }

            const data = await res.json();
            setRequests([data.request, ...requests]);
            toast.success("Request submitted!");
            setSelectedType(null);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    const config = selectedType ? formConfig[selectedType] : null;

    return (
        <div className="p-6 max-w-3xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Request software, submit your own, or suggest a repo to be showcased
                </p>
            </div>

            {/* Type selector or form */}
            {!selectedType ? (
                <div className="grid gap-3 sm:grid-cols-3">
                    {requestTypes.map((rt) => (
                        <Card
                            key={rt.value}
                            className="border-border/50 hover:bg-muted/50 transition cursor-pointer group"
                            onClick={() => setSelectedType(rt.value)}
                        >
                            <CardContent className="p-5">
                                <div className="h-10 w-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center mb-3 group-hover:bg-foreground/[0.08] transition">
                                    <rt.icon className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium text-sm mb-1">{rt.label}</h3>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {rt.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-border/50">
                    <CardHeader className="pb-4">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedType(null)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <CardTitle className="text-base font-semibold">
                                {requestTypes.find((rt) => rt.value === selectedType)?.label}
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={onSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">{config!.titleLabel}</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder={config!.titlePlaceholder}
                                    required
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">{config!.descLabel}</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder={config!.descPlaceholder}
                                    required
                                    className="bg-muted/50 border-border/50 min-h-[80px]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="url">{config!.urlLabel}</Label>
                                <Input
                                    id="url"
                                    name="url"
                                    placeholder={config!.urlPlaceholder}
                                    required={config!.urlRequired}
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setSelectedType(null)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Request List */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Your Requests</h2>
                <div className="space-y-3">
                    {loading ? (
                        <p className="text-muted-foreground text-sm">Loading...</p>
                    ) : requests.length === 0 ? (
                        <Card className="border-border/50">
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground text-sm">No requests yet</p>
                            </CardContent>
                        </Card>
                    ) : (
                        requests.map((req) => {
                            const isExpanded = expandedId === req._id;
                            return (
                                <Card
                                    key={req._id}
                                    className={`border-border/50 transition cursor-pointer ${isExpanded ? "bg-muted/30" : "hover:bg-muted/20"}`}
                                    onClick={() => setExpandedId(isExpanded ? null : req._id)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h3 className="font-medium text-sm">{req.title}</h3>
                                                    <Badge className={typeColors[req.type] || typeColors["software-request"]}>
                                                        {typeLabels[req.type] || "Request"}
                                                    </Badge>
                                                    <Badge variant={statusVariant[req.status] || "outline"}>
                                                        {req.status}
                                                    </Badge>
                                                    {req.adminNotes && (
                                                        <span className="flex items-center gap-1 text-xs text-blue-400">
                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                            Admin message
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-sm text-muted-foreground ${isExpanded ? "" : "line-clamp-2"}`}>
                                                    {req.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {new Date(req.createdAt).toLocaleDateString()}
                                                </span>
                                                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 space-y-3">
                                                {req.url && (
                                                    <a
                                                        href={req.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="h-3 w-3" />
                                                        {req.type === "showcase-repo" ? "Repository" : "Project Link"}
                                                    </a>
                                                )}
                                                {req.adminNotes ? (
                                                    <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1.5">
                                                            <MessageCircle className="h-3.5 w-3.5" />
                                                            Message from Admin
                                                        </div>
                                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                                            {req.adminNotes}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">No message from admin yet</p>
                                                )}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
