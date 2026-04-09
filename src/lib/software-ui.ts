import {
  Monitor,
  Code,
  Zap,
  Wrench,
  Film,
  Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  "operating-system": Monitor,
  development: Code,
  productivity: Zap,
  utility: Wrench,
  multimedia: Film,
  other: Package,
};

export const categoryColors: Record<string, string> = {
  "operating-system": "from-blue-500 to-cyan-500",
  development: "from-green-500 to-emerald-500",
  productivity: "from-yellow-500 to-orange-500",
  utility: "from-purple-500 to-pink-500",
  multimedia: "from-red-500 to-rose-500",
  other: "from-gray-500 to-slate-500",
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}
