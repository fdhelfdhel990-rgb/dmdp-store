import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function environmentValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return undefined;
}

const endpoint = environmentValue("CLOUDFLARE_R2_ENDPOINT", "R2_ENDPOINT");
const bucket = environmentValue("CLOUDFLARE_R2_BUCKET", "R2_BUCKET");
const client = endpoint ? new S3Client({
  region: "auto",
  endpoint,
  credentials: {
    accessKeyId: environmentValue("CLOUDFLARE_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID") ?? "",
    secretAccessKey: environmentValue("CLOUDFLARE_R2_SECRET_ACCESS_KEY", "R2_SECRET_ACCESS_KEY") ?? "",
  },
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
  const configuredUrl = environmentValue("CLOUDFLARE_R2_PUBLIC_URL", "R2_PUBLIC_URL");
  if (!configuredUrl) throw new Error("CLOUDFLARE_R2_PUBLIC_URL atau R2_PUBLIC_URL harus dikonfigurasi untuk URL file publik.");

  let base: URL;
  try {
    base = new URL(configuredUrl);
  } catch {
    throw new Error("URL publik R2 harus berupa URL HTTPS yang valid.");
  }

  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) {
    throw new Error("URL publik R2 harus menggunakan HTTPS tanpa kredensial, query, atau fragment.");
  }

  const basePath = base.pathname.replace(/\/+$/, "");
  const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  base.pathname = `${basePath}/${encodedKey}`;

  return base.toString();
}
