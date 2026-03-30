"use client";

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

export interface BasicInfoData {
    name: string;
    description: string;
    category: string;
    license: string;
    website: string;
    githubUrl: string;
    isFeatured: boolean;
}

interface StepBasicInfoProps {
    data: BasicInfoData;
    onChange: (data: BasicInfoData) => void;
}

export default function StepBasicInfo({ data, onChange }: StepBasicInfoProps) {
    function update(field: keyof BasicInfoData, value: string | boolean) {
        onChange({ ...data, [field]: value });
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Software Name *</Label>
                <Input
                    id="name"
                    value={data.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="e.g., Ubuntu"
                    required
                    className="bg-muted/50 border-border/50"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the software..."
                    rows={4}
                    className="bg-muted/50 border-border/50"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={data.category} onValueChange={(v) => update("category", v)}>
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
                        value={data.license}
                        onChange={(e) => update("license", e.target.value)}
                        placeholder="e.g., GPL-3.0"
                        className="bg-muted/50 border-border/50"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="website">Website URL</Label>
                    <Input
                        id="website"
                        value={data.website}
                        onChange={(e) => update("website", e.target.value)}
                        placeholder="https://..."
                        className="bg-muted/50 border-border/50"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input
                        id="githubUrl"
                        value={data.githubUrl}
                        onChange={(e) => update("githubUrl", e.target.value)}
                        placeholder="https://github.com/..."
                        className="bg-muted/50 border-border/50"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isFeatured"
                    checked={data.isFeatured}
                    onChange={(e) => update("isFeatured", e.target.checked)}
                    className="rounded"
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">
                    Feature on homepage
                </Label>
            </div>
        </div>
    );
}
