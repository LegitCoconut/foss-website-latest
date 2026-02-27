import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVersion {
    _id: mongoose.Types.ObjectId;
    versionNumber: string;
    releaseNotes: string;
    fileKey: string;
    fileName: string;
    fileSize: number;
    checksum: string;
    platform: string;
    architecture: string;
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
        fileKey: {
            type: String,
            required: [true, "File key is required"],
        },
        fileName: {
            type: String,
            required: [true, "File name is required"],
        },
        fileSize: {
            type: Number,
            required: [true, "File size is required"],
        },
        checksum: {
            type: String,
            default: "",
        },
        platform: {
            type: String,
            enum: ["windows", "linux", "macos", "cross-platform"],
            default: "cross-platform",
        },
        architecture: {
            type: String,
            enum: ["x86_64", "arm64", "universal", "other"],
            default: "x86_64",
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
    license: string;
    isFeatured: boolean;
    versions: IVersion[];
    totalDownloads: number;
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
        totalDownloads: {
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

const Software: Model<ISoftware> =
    mongoose.models.Software || mongoose.model<ISoftware>("Software", SoftwareSchema);

export default Software;
