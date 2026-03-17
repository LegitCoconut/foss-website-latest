"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

export default function NewSoftwarePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState("other");

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/software", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    description: formData.get("description"),
                    category,
                    website: formData.get("website"),
                    license: formData.get("license"),
                    isFeatured: formData.get("isFeatured") === "on",
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to create software");
                return;
            }

            toast.success("Software created! Now add versions.");
            router.push(`/admin/software/${data.software._id}`);
        } catch {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Add New Software</h1>

            <Card className="border-border/50">
                <CardContent className="p-6">
                    <form onSubmit={onSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Software Name *</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g., Ubuntu"
                                required
                                className="bg-muted/50 border-border/50"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the software..."
                                rows={4}
                                className="bg-muted/50 border-border/50"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select value={category} onValueChange={setCategory}>
                                    <SelectTrigger className="bg-muted/50 border-border/50">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="operating-system">Operating System</SelectItem>
                                        <SelectItem value="development">Development</SelectItem>
                                        <SelectItem value="productivity">Productivity</SelectItem>
                                        <SelectItem value="utility">Utility</SelectItem>
                                        <SelectItem value="multimedia">Multimedia</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="license">License</Label>
                                <Input
                                    id="license"
                                    name="license"
                                    placeholder="e.g., GPL-3.0"
                                    className="bg-muted/50 border-border/50"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">Website URL</Label>
                            <Input
                                id="website"
                                name="website"
                                placeholder="https://..."
                                className="bg-muted/50 border-border/50"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isFeatured" name="isFeatured" className="rounded" />
                            <Label htmlFor="isFeatured" className="cursor-pointer">
                                Feature on homepage
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="mr-2 h-4 w-4" />
                            )}
                            Create Software
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
