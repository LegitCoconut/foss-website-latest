"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Global fetch interceptor that redirects to /rate-limited on 429 responses.
 * Mounted once in the root layout.
 */
export function RateLimitInterceptor() {
    const router = useRouter();

    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async function (...args: Parameters<typeof fetch>) {
            const response = await originalFetch.apply(this, args);

            if (response.status === 429) {
                try {
                    const cloned = response.clone();
                    const data = await cloned.json();
                    const reset = data.reset || 60;
                    router.push(`/rate-limited?reset=${reset}`);
                } catch {
                    router.push("/rate-limited?reset=60");
                }
            }

            return response;
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [router]);

    return null;
}
