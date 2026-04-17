import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    storageLimit: number;
    maxFileSize?: number;
    status: "active" | "suspended";
    members: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
    {
        name: {
            type: String,
            required: [true, "Team name is required"],
            trim: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        storageLimit: {
            type: Number,
            required: [true, "Storage limit is required"],
        },
        maxFileSize: {
            type: Number,
            required: false,
        },
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
        },
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    {
        timestamps: true,
    }
);

TeamSchema.index({ members: 1 });

if (mongoose.models.Team) {
    delete mongoose.models.Team;
}
const Team: Model<ITeam> = mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
