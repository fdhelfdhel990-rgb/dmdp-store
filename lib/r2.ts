import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT;
const bucket = process.env.R2_BUCKET;
const client = endpoint ? new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "" },
}) : null;

export async function uploadFile(key: string, file: File, visibility: "public" | "private" = "private"): Promise<string> {
  if (!client || !bucket) throw new Error("R2_ENDPOINT dan R2_BUCKET harus dikonfigurasi.");
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: `${visibility}/${key}`, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type || "application/octet-stream" }));
  return `${visibility}/${key}`;
}

export async function deleteFile(key: string): Promise<void> {
  if (!client || !bucket) throw new Error("R2_ENDPOINT dan R2_BUCKET harus dikonfigurasi.");
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function readFile(key: string) {
  if (!client || !bucket) throw new Error("R2_ENDPOINT dan R2_BUCKET harus dikonfigurasi.");
  return client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
}

export function publicFileUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) throw new Error("R2_PUBLIC_URL harus dikonfigurasi untuk URL file publik.");
  return `${base.replace(/\/$/, "")}/${key}`;
}
