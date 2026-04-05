import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    registerNumber: string;
    role: "user" | "admin";
    status: "active" | "suspended";
    totpSecret: string;
    totpEnabled: boolean;
    mfaVerifiedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false,
        },
        registerNumber: {
            type: String,
            default: "",
            trim: true,
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
        },
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
        },
        totpSecret: {
            type: String,
            default: "",
            select: false,
        },
        totpEnabled: {
            type: Boolean,
            default: false,
        },
        mfaVerifiedAt: {
            type: Date,
            select: false,
        },
    },
    {
        timestamps: true,
    }
);

if (mongoose.models.User) {
    delete mongoose.models.User;
}
const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);

export default User;
