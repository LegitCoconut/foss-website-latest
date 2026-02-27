import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/foss-distribution";

async function seedAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB");

        const User = mongoose.models.User || mongoose.model("User", new mongoose.Schema({
            name: String,
            email: { type: String, unique: true },
            password: String,
            role: { type: String, default: "user" },
        }, { timestamps: true }));

        const existingAdmin = await User.findOne({ role: "admin" });
        if (existingAdmin) {
            console.log("Admin user already exists:");
            console.log(`  Email: ${existingAdmin.email}`);
            console.log(`  Name: ${existingAdmin.name}`);
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash("admin123", 12);

        const admin = await User.create({
            name: "Admin",
            email: "admin@foss.local",
            password: hashedPassword,
            role: "admin",
        });

        console.log("Admin user created successfully!");
        console.log(`  Email: ${admin.email}`);
        console.log(`  Password: admin123`);
        console.log("");
        console.log("⚠️  Change this password immediately after first login!");

        process.exit(0);
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
}

seedAdmin();
