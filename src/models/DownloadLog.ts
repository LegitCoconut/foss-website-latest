import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDownloadLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    softwareId: mongoose.Types.ObjectId;
    versionId: mongoose.Types.ObjectId;
    softwareName: string;
    versionNumber: string;
    createdAt: Date;
}

const DownloadLogSchema = new Schema<IDownloadLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
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
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

DownloadLogSchema.index({ createdAt: -1 });
DownloadLogSchema.index({ userId: 1 });
DownloadLogSchema.index({ softwareId: 1 });

const DownloadLog: Model<IDownloadLog> =
    mongoose.models.DownloadLog ||
    mongoose.model<IDownloadLog>("DownloadLog", DownloadLogSchema);

export default DownloadLog;
