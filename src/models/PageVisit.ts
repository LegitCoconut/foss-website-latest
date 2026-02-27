import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPageVisit extends Document {
    _id: mongoose.Types.ObjectId;
    path: string;
    userId?: mongoose.Types.ObjectId;
    userAgent: string;
    createdAt: Date;
}

const PageVisitSchema = new Schema<IPageVisit>(
    {
        path: {
            type: String,
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        userAgent: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

PageVisitSchema.index({ createdAt: -1 });
PageVisitSchema.index({ path: 1 });

const PageVisit: Model<IPageVisit> =
    mongoose.models.PageVisit ||
    mongoose.model<IPageVisit>("PageVisit", PageVisitSchema);

export default PageVisit;
