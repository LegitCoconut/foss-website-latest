import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.S3_REGION || "garage",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

export async function uploadFile(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | ReadableStream,
    contentType: string
) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body as Buffer,
        ContentType: contentType,
    });
    return s3Client.send(command);
}

export async function deleteFile(bucket: string, key: string) {
    const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return s3Client.send(command);
}

export async function getPresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn: number = 300
) {
    const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

export async function getPresignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn: number = 600
) {
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
}

export function getAssetUrl(key: string) {
    return `${process.env.S3_ENDPOINT}/${process.env.S3_ASSETS_BUCKET}/${key}`;
}

export { s3Client };
