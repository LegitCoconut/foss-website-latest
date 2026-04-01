import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDownloadLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    ipAddress: string;
    softwareId: mongoose.Types.ObjectId;
    versionId: mongoose.Types.ObjectId;
    softwareName: string;
    versionNumber: string;
    fileName: string;
    createdAt: Date;
}

const DownloadLogSchema = new Schema<IDownloadLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        userName: {
            type: String,
            default: "",
        },
        userEmail: {
            type: String,
            default: "",
        },
        ipAddress: {
            type: String,
            default: "",
        },
        softwareId: {
            type: Schema.Types.ObjectId,
            ref: "Software",
            required: true,
        },
        versionId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        softwareName: {
            type: String,
            required: true,
        },
        versionNumber: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

DownloadLogSchema.index({ createdAt: -1 });
DownloadLogSchema.index({ userId: 1 });
DownloadLogSchema.index({ softwareId: 1 });

if (mongoose.models.DownloadLog) {
    delete mongoose.models.DownloadLog;
}
const DownloadLog: Model<IDownloadLog> = mongoose.model<IDownloadLog>("DownloadLog", DownloadLogSchema);

export default DownloadLog;
