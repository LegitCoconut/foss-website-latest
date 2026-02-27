import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISoftwareRequest extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    url: string;
    status: "pending" | "approved" | "rejected" | "completed";
    adminNotes: string;
    createdAt: Date;
    updatedAt: Date;
}

const SoftwareRequestSchema = new Schema<ISoftwareRequest>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
        },
        url: {
            type: String,
            default: "",
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected", "completed"],
            default: "pending",
        },
        adminNotes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

SoftwareRequestSchema.index({ userId: 1 });
SoftwareRequestSchema.index({ status: 1 });

const SoftwareRequest: Model<ISoftwareRequest> =
    mongoose.models.SoftwareRequest ||
    mongoose.model<ISoftwareRequest>("SoftwareRequest", SoftwareRequestSchema);

export default SoftwareRequest;
