import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
        } & DefaultSession["user"];
    }

    interface User {
        role?: string;
    }
}

export interface VersionFile {
    _id: string;
    fileKey: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    platform: string;
    architecture: string;
}

export interface SoftwareVersion {
    _id: string;
    versionNumber: string;
    releaseNotes: string;
    files: VersionFile[];
    // Legacy single-file fields
    fileKey: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    platform: string;
    architecture: string;
    isDeleted: boolean;
    createdAt: string;
}

export interface SoftwareItem {
    _id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    platform: string[];
    iconKey: string;
    screenshotKeys: string[];
    website: string;
    githubUrl: string;
    license: string;
    isFeatured: boolean;
    versions: SoftwareVersion[];
    defaultVersionId: string;
    totalDownloads: number;
    status: "draft" | "published";
    completedSteps: number;
    createdAt: string;
    updatedAt: string;
}

export interface SoftwareRequestItem {
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    type: "software-request" | "submit-software" | "showcase-repo";
    title: string;
    description: string;
    url: string;
    status: "pending" | "approved" | "rejected" | "completed";
    adminNotes: string;
    createdAt: string;
}

export interface AnalyticsData {
    totalUsers: number;
    totalDownloads: number;
    totalSoftware: number;
    pendingRequests: number;
    downloadsToday: number;
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    topSoftware: { name: string; downloads: number }[];
    recentDownloads: {
        softwareName: string;
        versionNumber: string;
        userName: string;
        createdAt: string;
    }[];
    downloadsOverTime: { date: string; count: number }[];
    pageVisitsOverTime: { date: string; count: number }[];
    softwarePageVisits: { slug: string; name: string; visits: number }[];
}

export interface TeamMember {
    _id: string;
    name: string;
    email: string;
}

export interface TeamItem {
    _id: string;
    name: string;
    description: string;
    storageLimit: number;
    status: "active" | "suspended";
    members: TeamMember[];
    memberCount: number;
    fileCount: number;
    totalStorageUsed: number;
    createdAt: string;
    updatedAt: string;
}

export interface TeamFileItem {
    _id: string;
    teamId: string;
    uploadedBy: { _id: string; name: string; email: string };
    fileKey: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    description: string;
    createdAt: string;
}
