import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimitLog extends Document {
    _id: mongoose.Types.ObjectId;
    userId?: mongoose.Types.ObjectId;
    userName: string;
    userEmail: string;
    ipAddress: string;
    path: string;
    method: string;
    createdAt: Date;
}

const RateLimitLogSchema = new Schema<IRateLimitLog>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        userName: { type: String, default: "" },
        userEmail: { type: String, default: "" },
        ipAddress: { type: String, default: "" },
        path: { type: String, required: true },
        method: { type: String, default: "" },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

RateLimitLogSchema.index({ createdAt: -1 });
RateLimitLogSchema.index({ userId: 1 });
RateLimitLogSchema.index({ ipAddress: 1 });

if (mongoose.models.RateLimitLog) {
    delete mongoose.models.RateLimitLog;
}
const RateLimitLog: Model<IRateLimitLog> = mongoose.model<IRateLimitLog>(
    "RateLimitLog",
    RateLimitLogSchema
);

export default RateLimitLog;
