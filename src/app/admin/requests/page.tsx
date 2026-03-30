"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    LayoutGrid,
    List,
    Send,
    MessageCircle,
} from "lucide-react";

interface RequestEntry {
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    type?: string;
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

const typeLabels: Record<string, string> = {
    "software-request": "Request",
    "submit-software": "Submission",
    "showcase-repo": "Showcase",
};

const typeColors: Record<string, string> = {
    "software-request": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    "submit-software": "bg-green-500/10 text-green-400 border-green-500/20",
    "showcase-repo": "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function AdminRequestsPage() {
    const [requests, setRequests] = useState<RequestEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [view, setView] = useState<"card" | "table">("card");
    const [selectedRequest, setSelectedRequest] = useState<RequestEntry | null>(null);
    const [noteText, setNoteText] = useState("");
    const [sendingNote, setSendingNote] = useState(false);

    useEffect(() => {
        setLoading(true);
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

    async function sendNote(id: string) {
        if (!noteText.trim()) return;
        setSendingNote(true);
        try {
            const req = requests.find((r) => r._id === id);
            const res = await fetch(`/api/requests/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: req?.status, adminNotes: noteText }),
            });

            if (res.ok) {
                setRequests(
                    requests.map((r) => (r._id === id ? { ...r, adminNotes: noteText } : r))
                );
                if (selectedRequest?._id === id) {
                    setSelectedRequest({ ...selectedRequest, adminNotes: noteText });
                }
                toast.success("Message sent");
            } else {
                toast.error("Failed to send message");
            }
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSendingNote(false);
        }
    }

    function openRequestDetail(req: RequestEntry) {
        setSelectedRequest(req);
        setNoteText(req.adminNotes || "");
    }

    function ActionButtons({ req }: { req: RequestEntry }) {
        if (req.status !== "pending") return null;
        return (
            <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => updateStatus(req._id, "approved")} className="text-green-400 hover:text-green-300 h-7 px-2 text-xs">
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(req._id, "rejected")} className="text-red-400 hover:text-red-300 h-7 px-2 text-xs">
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus(req._id, "completed")} className="text-blue-400 hover:text-blue-300 h-7 px-2 text-xs">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Done
                </Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Requests</h1>
                <div className="flex items-center gap-3">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-40 bg-muted/50 border-border/50 h-9 text-sm">
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
                    <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setView("card")}
                            className={`p-2 transition-colors ${view === "card" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setView("table")}
                            className={`p-2 transition-colors ${view === "table" ? "bg-foreground/[0.08] text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            ) : requests.length === 0 ? (
                <Card className="border-border/50">
                    <CardContent className="p-12 text-center">
                        <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground">No requests found</p>
                    </CardContent>
                </Card>
            ) : view === "card" ? (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {requests.map((req) => (
                        <Card
                            key={req._id}
                            className="border-border/50 hover:bg-muted/30 transition cursor-pointer"
                            onClick={() => openRequestDetail(req)}
                        >
                            <CardContent className="p-4 space-y-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <Badge className={typeColors[req.type || "software-request"]}>
                                            {typeLabels[req.type || "software-request"]}
                                        </Badge>
                                        <Badge className={statusColors[req.status]}>{req.status}</Badge>
                                        {req.adminNotes && (
                                            <MessageCircle className="h-3.5 w-3.5 text-blue-400 ml-auto" />
                                        )}
                                    </div>
                                    <h3 className="font-medium text-sm truncate">{req.title}</h3>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1 truncate">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        {req.userName || "Unknown"}
                                    </span>
                                    <span className="flex items-center gap-1 flex-shrink-0">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {req.url && (
                                    <a
                                        href={req.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        Link
                                    </a>
                                )}
                                <div onClick={(e) => e.stopPropagation()}>
                                    <ActionButtons req={req} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                /* Table View */
                <Card className="border-border/50">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Link</TableHead>
                                    <TableHead className="w-[200px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={req._id} className="cursor-pointer" onClick={() => openRequestDetail(req)}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <span className="font-medium text-sm">{req.title}</span>
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs">{req.description}</p>
                                                </div>
                                                {req.adminNotes && <MessageCircle className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={typeColors[req.type || "software-request"]}>
                                                {typeLabels[req.type || "software-request"]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <span>{req.userName || "Unknown"}</span>
                                                <p className="text-xs text-muted-foreground">{req.userEmail}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={statusColors[req.status]}>{req.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {req.url && (
                                                <a href={req.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            )}
                                        </TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <ActionButtons req={req} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <p className="text-xs text-muted-foreground">
                {requests.length} request{requests.length !== 1 ? "s" : ""}
            </p>

            {/* Request Detail Dialog */}
            <Dialog open={!!selectedRequest} onOpenChange={(open) => { if (!open) setSelectedRequest(null); }}>
                <DialogContent className="sm:max-w-lg">
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 flex-wrap">
                                    {selectedRequest.title}
                                    <Badge className={statusColors[selectedRequest.status]}>{selectedRequest.status}</Badge>
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1">
                                        <User className="h-3 w-3" />
                                        {selectedRequest.userName || "Unknown"} ({selectedRequest.userEmail || ""})
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(selectedRequest.createdAt).toLocaleDateString()}
                                    </span>
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <Badge className={typeColors[selectedRequest.type || "software-request"]}>
                                            {typeLabels[selectedRequest.type || "software-request"]}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedRequest.description}</p>
                                    {selectedRequest.url && (
                                        <a
                                            href={selectedRequest.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline mt-2"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                            Project Link
                                        </a>
                                    )}
                                </div>

                                {/* Admin Message */}
                                <div className="space-y-2 border-t border-border/50 pt-4">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                                        Admin Message
                                    </label>
                                    <Textarea
                                        value={noteText}
                                        onChange={(e) => setNoteText(e.target.value)}
                                        placeholder="Write a message to the user about this request..."
                                        className="bg-muted/50 border-border/50 min-h-[80px]"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => sendNote(selectedRequest._id)}
                                        disabled={sendingNote || !noteText.trim()}
                                        className="gap-2"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {sendingNote ? "Sending..." : selectedRequest.adminNotes ? "Update Message" : "Send Message"}
                                    </Button>
                                </div>

                                {/* Action Buttons */}
                                {selectedRequest.status === "pending" && (
                                    <div className="flex gap-2 border-t border-border/50 pt-4">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                updateStatus(selectedRequest._id, "approved");
                                                setSelectedRequest({ ...selectedRequest, status: "approved" });
                                            }}
                                            className="text-green-400 border-green-500/30 hover:bg-green-500/10"
                                        >
                                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                updateStatus(selectedRequest._id, "rejected");
                                                setSelectedRequest({ ...selectedRequest, status: "rejected" });
                                            }}
                                            className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                                        >
                                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                updateStatus(selectedRequest._id, "completed");
                                                setSelectedRequest({ ...selectedRequest, status: "completed" });
                                            }}
                                            className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Done
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
