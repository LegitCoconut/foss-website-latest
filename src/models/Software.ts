import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVersionFile {
    _id: mongoose.Types.ObjectId;
    fileKey: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    platform: string;
    architecture: string;
}

const VersionFileSchema = new Schema<IVersionFile>({
    fileKey: { type: String, required: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    checksum: { type: String, default: "" },
    platform: {
        type: String,
        enum: ["windows", "linux", "macos", "macos-arm", "cross-platform"],
        default: "cross-platform",
    },
    architecture: {
        type: String,
        enum: ["x86_64", "arm64", "universal", "other"],
        default: "x86_64",
    },
});

export interface IVersion {
    _id: mongoose.Types.ObjectId;
    versionNumber: string;
    releaseNotes: string;
    files: IVersionFile[];
    // Legacy single-file fields (kept for backward compatibility)
    fileKey: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    platform: string;
    architecture: string;
    isDeleted: boolean;
    createdAt: Date;
}

const VersionSchema = new Schema<IVersion>(
    {
        versionNumber: {
            type: String,
            required: [true, "Version number is required"],
        },
        releaseNotes: {
            type: String,
            default: "",
        },
        files: {
            type: [VersionFileSchema],
            default: [],
        },
        // Legacy fields for backward compat
        fileKey: {
            type: String,
            default: "",
        },
        fileName: {
            type: String,
            default: "",
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        checksum: {
            type: String,
            default: "",
        },
        platform: {
            type: String,
            enum: ["windows", "linux", "macos", "macos-arm", "cross-platform"],
            default: "cross-platform",
        },
        architecture: {
            type: String,
            enum: ["x86_64", "arm64", "universal", "other"],
            default: "x86_64",
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

export interface ISoftware extends Document {
    _id: mongoose.Types.ObjectId;
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
    versions: IVersion[];
    defaultVersionId: string;
    totalDownloads: number;
    status: "draft" | "published";
    completedSteps: number;
    createdAt: Date;
    updatedAt: Date;
}

const SoftwareSchema = new Schema<ISoftware>(
    {
        name: {
            type: String,
            required: [true, "Software name is required"],
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            default: "",
        },
        category: {
            type: String,
            enum: [
                "operating-system",
                "development",
                "productivity",
                "utility",
                "multimedia",
                "other",
            ],
            default: "other",
        },
        platform: {
            type: [String],
            enum: ["windows", "linux", "macos", "cross-platform"],
            default: ["cross-platform"],
        },
        iconKey: {
            type: String,
            default: "",
        },
        screenshotKeys: {
            type: [String],
            default: [],
        },
        website: {
            type: String,
            default: "",
        },
        githubUrl: {
            type: String,
            default: "",
        },
        license: {
            type: String,
            default: "",
        },
        isFeatured: {
            type: Boolean,
            default: false,
        },
        versions: {
            type: [VersionSchema],
            default: [],
        },
        defaultVersionId: {
            type: String,
            default: "",
        },
        totalDownloads: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft",
        },
        completedSteps: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

SoftwareSchema.index({ slug: 1 });
SoftwareSchema.index({ category: 1 });
SoftwareSchema.index({ name: "text", description: "text" });

// Delete cached model in dev to pick up schema changes on hot reload
if (mongoose.models.Software) {
    delete mongoose.models.Software;
}
const Software: Model<ISoftware> = mongoose.model<ISoftware>("Software", SoftwareSchema);

export default Software;
