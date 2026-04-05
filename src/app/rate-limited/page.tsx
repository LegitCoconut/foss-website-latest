"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Clock, ArrowLeft, RefreshCw } from "lucide-react";

function RateLimitContent() {
    const searchParams = useSearchParams();
    const initialReset = Math.max(parseInt(searchParams.get("reset") || "60"), 1);
    const [seconds, setSeconds] = useState(initialReset);
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        if (seconds <= 0) {
            setExpired(true);
            return;
        }
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds]);

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const displayTime = minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
    const progress = initialReset > 0 ? ((initialReset - seconds) / initialReset) * 100 : 100;

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
                <CardContent className="p-8 text-center space-y-6">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <ShieldAlert className="h-8 w-8 text-red-400" />
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold tracking-tight mb-2">Rate Limit Reached</h1>
                        <p className="text-sm text-muted-foreground">
                            You&apos;ve made too many requests. Please wait before trying again.
                        </p>
                    </div>

                    {!expired ? (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span className="text-sm">Resets in</span>
                            </div>
                            <div className="text-4xl font-bold font-mono tabular-nums tracking-wider">
                                {displayTime}
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden max-w-xs mx-auto">
                                <div
                                    className="h-full rounded-full bg-green-400/60 transition-all duration-1000 ease-linear"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-center gap-2 text-green-400">
                                <RefreshCw className="h-4 w-4" />
                                <span className="text-sm font-medium">Ready to go</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                The rate limit has reset. You can continue using the app.
                            </p>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                        {expired ? (
                            <Button asChild>
                                <Link href="/">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Home
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="outline" asChild>
                                <Link href="/">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back to Home
                                </Link>
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function RateLimitedPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[80vh] flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-muted-foreground animate-pulse" />
            </div>
        }>
            <RateLimitContent />
        </Suspense>
    );
}
