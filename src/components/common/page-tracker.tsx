"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function PageTracker() {
    const pathname = usePathname();
    const { data: session } = useSession();

    useEffect(() => {
        fetch("/api/analytics/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                path: pathname,
                userId: session?.user?.id || null,
            }),
        }).catch(() => { });
    }, [pathname, session?.user?.id]);

    return null;
}
