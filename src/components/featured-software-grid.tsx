"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categoryColors, categoryIcons, formatBytes } from "@/lib/software-ui";
import { cn } from "@/lib/utils";
import { Download, Package, Star } from "lucide-react";

const INITIAL_VISIBLE = 6;

export type SoftwareCardData = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  iconKey: string;
  totalDownloads: number;
  versions: { versionNumber: string; fileSize: number }[];
};

type FeaturedSoftwareGridProps = {
  items: SoftwareCardData[];
};

export default function FeaturedSoftwareGrid({ items }: FeaturedSoftwareGridProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = items.slice(0, INITIAL_VISIBLE);
  const hiddenItems = items.slice(INITIAL_VISIBLE);
  const showHidden = expanded || hiddenItems.length === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleItems.map((sw) => (
          <SoftwareCard key={sw._id} sw={sw} badgeLabel="Featured" badgeIcon={Star} />
        ))}
      </div>

      {hiddenItems.length > 0 && (
        <div className="relative">
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-300",
              showHidden
                ? "max-h-[2000px] opacity-100"
                : "max-h-40 sm:max-h-48 overflow-hidden opacity-90 pointer-events-none"
            )}
          >
            {hiddenItems.map((sw) => (
              <SoftwareCard key={sw._id} sw={sw} badgeLabel="Featured" badgeIcon={Star} />
            ))}
          </div>
          {!showHidden && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
          )}
        </div>
      )}

      {!showHidden && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="text-sm px-6 h-10"
            onClick={() => setExpanded(true)}
          >
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}

type SoftwareCardProps = {
  sw: SoftwareCardData;
  badgeLabel?: string;
  badgeIcon?: typeof Star;
};

function SoftwareCard({ sw, badgeLabel, badgeIcon: BadgeIcon }: SoftwareCardProps) {
  const Icon = categoryIcons[sw.category] || Package;
  const color = categoryColors[sw.category] || categoryColors.other;
  const latestVersion = sw.versions[0];

  return (
    <Link href={`/catalog/${sw.slug}`}>
      <Card className="group border-border/50 hover:bg-muted/50 transition-all duration-300 hover:border-foreground/20 hover:shadow-lg cursor-pointer h-full">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            {sw.iconKey ? (
              <div className="h-11 w-11 rounded-xl overflow-hidden shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                <Image
                  src={`/api/assets/${sw.iconKey}`}
                  alt={sw.name}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}
              >
                <Icon className="h-5 w-5 text-white" />
              </div>
            )}
            {badgeLabel && (
              <Badge
                variant="secondary"
                className="text-[10px] bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
              >
                {BadgeIcon && <BadgeIcon className="h-2.5 w-2.5 mr-1" />}
                {badgeLabel}
              </Badge>
            )}
          </div>

          <h3 className="font-semibold mb-1 group-hover:text-foreground/80 transition-colors">
            {sw.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {sw.description || "No description available"}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {sw.totalDownloads.toLocaleString()}
            </div>
            {latestVersion && (
              <span className="font-mono">
                v{latestVersion.versionNumber}
                {latestVersion.fileSize > 0 && ` \u00b7 ${formatBytes(latestVersion.fileSize)}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
