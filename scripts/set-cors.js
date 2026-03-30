#!/usr/bin/env node
const { S3Client, PutBucketCorsCommand } = require("@aws-sdk/client-s3");

const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT || "http://localhost:3900",
    region: process.env.S3_REGION || "garage",
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
});

const ALLOWED_ORIGIN = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function setCors(bucket) {
    await client.send(
        new PutBucketCorsCommand({
            Bucket: bucket,
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedOrigins: [ALLOWED_ORIGIN],
                        AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
                        AllowedHeaders: ["*"],
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3600,
                    },
                ],
            },
        })
    );
    console.log(`CORS set for ${bucket}`);
}

Promise.all([
    setCors(process.env.S3_FILES_BUCKET || "foss-files"),
    setCors(process.env.S3_ASSETS_BUCKET || "foss-assets"),
])
    .then(() => console.log("Done"))
    .catch((e) => {
        console.error("Failed to set CORS:", e.message);
        process.exit(1);
    });
