import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for MinIO and some S3-compatible providers like Railway's
});

/**
 * Generates a presigned URL for reading a file from S3.
 * @param key The object key in the bucket.
 * @param expiresIn Time in seconds until the URL expires (default 1 hour).
 */
export async function getReadPresignedUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Generates a presigned URL for uploading a file to S3.
 * @param key The object key in the bucket.
 * @param contentType The MIME type of the file.
 * @param expiresIn Time in seconds until the URL expires (default 15 minutes).
 */
export async function getWritePresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 900,
) {
  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

