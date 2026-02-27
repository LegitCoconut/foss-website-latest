"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Calendar } from "lucide-react";

interface UserEntry {
    _id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We'll use a simple fetch that gets users from analytics context
        // For a full implementation, you'd add a /api/users endpoint
        fetch("/api/analytics")
            .then((r) => r.json())
            .then((data) => {
                // Just show user count for now until users API is built
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">User Management</h1>

            <Card className="border-white/10 bg-white/[0.03]">
                <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground mb-2">
                        User management is available through the admin dashboard analytics.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        User registration and access is managed through the authentication system.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
