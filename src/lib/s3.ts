// S3-compatible storage helpers (Wasabi / Backblaze B2 / DO Spaces / Bunny).
// Cloudflare R2 is forbidden — their AUP rejects adult content.
//
// Three things live here:
//   - getS3()                — lazy singleton client, reads env at first use
//   - presignGet({ key })    — short-lived download URL (LoRA + asset reads)
//   - presignPut({ key })    — short-lived upload URL the browser PUTs to
//   - publicUrl(key)         — CDN URL for finished assets (no auth)
//
// The fal + runpod adapters call presignGet to mint a one-shot LoRA URL.
// The /api/train endpoint calls presignPut to give the client a direct upload
// slot for the selfies zip (so we never proxy 30MB through the Next server).

import { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function ensureEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing — set in .env.local before using S3`);
  return v;
}

export function getS3(): S3Client {
  if (client) return client;
  const endpoint = ensureEnv("S3_ENDPOINT_URL");
  const region = process.env.S3_REGION ?? "us-east-1";
  client = new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: ensureEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: ensureEnv("S3_SECRET_ACCESS_KEY"),
    },
  });
  return client;
}

export function s3Bucket(): string {
  return ensureEnv("S3_BUCKET");
}

export function publicUrl(key: string): string {
  const base = process.env.S3_PUBLIC_URL ?? `${ensureEnv("S3_ENDPOINT_URL")}/${s3Bucket()}`;
  return `${base.replace(/\/$/, "")}/${key.replace(/^\//, "")}`;
}

interface PresignOpts {
  key: string;
  expiresIn?: number; // seconds
  contentType?: string;
}

export async function presignGet({ key, expiresIn = 300 }: PresignOpts): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: s3Bucket(), Key: key });
  return getSignedUrl(getS3(), cmd, { expiresIn });
}

export async function presignPut({
  key,
  expiresIn = 600,
  contentType = "application/octet-stream",
}: PresignOpts): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: s3Bucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getS3(), cmd, { expiresIn });
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await getS3().send(new HeadObjectCommand({ Bucket: s3Bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Where a user's trained LoRA lives.
 * We version it so retraining doesn't clobber the previous model and you can
 * roll back from /account if a training run came out worse.
 */
export function loraKey(userId: string, modelId: string): string {
  return `loras/${userId}/${modelId}.safetensors`;
}

/**
 * Where the selfies-zip uploaded for a given training run lives.
 * Kept for 30 days then lifecycle-rule-deleted by the bucket policy.
 */
export function trainingZipKey(userId: string, jobId: string): string {
  return `training/${userId}/${jobId}/selfies.zip`;
}
