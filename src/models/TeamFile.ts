import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeamFile extends Document {
    _id: mongoose.Types.ObjectId;
    teamId: mongoose.Types.ObjectId;
    uploadedBy: mongoose.Types.ObjectId;
    fileKey: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    description: string;
    createdAt: Date;
}

const TeamFileSchema = new Schema<ITeamFile>(
    {
        teamId: {
            type: Schema.Types.ObjectId,
            ref: "Team",
            required: true,
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        fileKey: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        fileSize: {
            type: Number,
            required: true,
        },
        contentType: {
            type: String,
            default: "application/octet-stream",
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

TeamFileSchema.index({ teamId: 1, createdAt: -1 });

if (mongoose.models.TeamFile) {
    delete mongoose.models.TeamFile;
}
const TeamFile: Model<ITeamFile> = mongoose.model<ITeamFile>("TeamFile", TeamFileSchema);

export default TeamFile;
