"use client";

import { useState, useRef, useEffect } from "react";
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
import { Check, ChevronsUpDown } from "lucide-react";

const COMMON_LICENSES = [
    "MIT",
    "Apache-2.0",
    "GPL-2.0",
    "GPL-3.0",
    "AGPL-3.0",
    "LGPL-2.1",
    "LGPL-3.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "MPL-2.0",
    "ISC",
    "Unlicense",
    "CC0-1.0",
    "CC-BY-4.0",
    "CC-BY-SA-4.0",
    "BSL-1.0",
    "Artistic-2.0",
    "Zlib",
    "PostgreSQL",
    "WTFPL",
];

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

function LicenseCombobox({ value, onValueChange }: { value: string; onValueChange: (v: string) => void }) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(value);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { setSearch(value); }, [value]);

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, []);

    const filtered = COMMON_LICENSES.filter((l) =>
        l.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div ref={ref} className="relative">
            <div className="relative">
                <Input
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); onValueChange(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    placeholder="Select or type a license..."
                    className="bg-muted/50 border-border/50 pr-8"
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                    <ChevronsUpDown className="h-4 w-4" />
                </button>
            </div>
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-md max-h-48 overflow-y-auto">
                    {filtered.map((license) => (
                        <button
                            key={license}
                            type="button"
                            onClick={() => { onValueChange(license); setSearch(license); setOpen(false); }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                            {value === license ? (
                                <Check className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                            ) : (
                                <span className="w-3.5 flex-shrink-0" />
                            )}
                            {license}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
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
                    <Label>License</Label>
                    <LicenseCombobox
                        value={data.license}
                        onValueChange={(v) => update("license", v)}
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
