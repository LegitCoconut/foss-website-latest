"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Share2, Loader2, Check } from "lucide-react";
import type { TeamFileItem, TeamMember } from "@/types";

interface ShareDialogProps {
    teamId: string;
    file: TeamFileItem | null;
    members: TeamMember[];
    onClose: () => void;
    onSaved: () => void;
}

function getSharedIds(file: TeamFileItem | null): Set<string> {
    if (!file || !file.sharedWith) return new Set();
    return new Set(
        file.sharedWith.map((u) =>
            typeof u === "string" ? u : u._id
        )
    );
}

export function ShareDialog({ teamId, file, members, onClose, onSaved }: ShareDialogProps) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setSelected(getSharedIds(file));
    }, [file]);

    if (!file) return null;

    const ownerId = file.uploadedBy?._id;
    const candidates = members.filter((m) => m._id !== ownerId);

    function toggle(userId: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    }

    async function save() {
        if (!file) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/team-storage/${teamId}/files/${file._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "share",
                    sharedWith: Array.from(selected),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to update sharing");
                return;
            }
            toast.success("Sharing updated");
            onSaved();
            onClose();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={!!file} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="border-border/50 bg-background max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        Share file for editing
                    </DialogTitle>
                    <DialogDescription>
                        Selected members will be able to edit <span className="font-medium text-foreground">{file.fileName}</span>. Only you or an admin can delete it.
                    </DialogDescription>
                </DialogHeader>

                {candidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        No other team members to share with.
                    </p>
                ) : (
                    <div className="max-h-72 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/50">
                        {candidates.map((m) => {
                            const isSelected = selected.has(m._id);
                            return (
                                <button
                                    key={m._id}
                                    type="button"
                                    onClick={() => toggle(m._id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                                        isSelected ? "bg-foreground/[0.08]" : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{m.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                    </div>
                                    <div
                                        className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                            isSelected
                                                ? "bg-foreground border-foreground"
                                                : "bg-background border-border"
                                        }`}
                                    >
                                        {isSelected && <Check className="h-3.5 w-3.5 text-background" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button className="flex-1" onClick={save} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
