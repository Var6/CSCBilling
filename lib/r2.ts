import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'node:crypto';

/**
 * Cloudflare R2 storage for vehicle documents, licences and photos.
 *
 * Uploads go straight from the browser to R2 using a short-lived presigned URL.
 * The credentials never reach the client, and — just as importantly — the file
 * bytes never pass through a serverless function, which on Vercel caps request
 * bodies at 4.5 MB. An RC book photo from a modern phone exceeds that easily.
 *
 * R2 speaks the S3 API, so the AWS SDK works against it unchanged. The region
 * must be "auto"; R2 has no regions but the signer requires one.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? '';
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? '';
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? '';
export const R2_BUCKET = process.env.R2_BUCKET ?? '';

/**
 * Derived rather than read from R2_ENDPOINT: that variable has been pasted with
 * quotes inside the URL before now, and a malformed endpoint fails at upload
 * time with an opaque error rather than at startup.
 */
const ENDPOINT =
  process.env.R2_ENDPOINT?.replace(/["']/g, '') ||
  (ACCOUNT_ID ? `https://${ACCOUNT_ID}.r2.cloudflarestorage.com` : '');

/** Public read base, e.g. https://pub-xxxx.r2.dev — set on the bucket in Cloudflare. */
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL ?? '').replace(/["']/g, '').replace(/\/+$/, '');

export const r2Configured = () =>
  Boolean(ACCESS_KEY_ID && SECRET_ACCESS_KEY && R2_BUCKET && ENDPOINT);

let client: S3Client | null = null;

/**
 * The one place an S3 client is built.
 *
 * Callers must not construct their own from process.env: the endpoint has been
 * pasted with embedded quotes more than once, and a second reader that skips
 * the sanitising above fails at upload time with an unresolvable hostname.
 */
export function getR2Client(): S3Client {
  return getClient();
}

function getClient(): S3Client {
  if (!r2Configured()) {
    throw new Error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, ' +
      'R2_SECRET_ACCESS_KEY and R2_BUCKET.',
    );
  }
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: ENDPOINT,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    });
  }
  return client;
}

/* ------------------------------------------------------------------ *
 * Keys
 * ------------------------------------------------------------------ */

/**
 * Everything this app writes is namespaced under `csc-billing/`.
 *
 * The bucket is shared with another project, so without a prefix a file called
 * `rc.jpg` from either system would overwrite the other's.
 */
const PREFIX = 'csc-billing';

export const UPLOAD_FOLDERS = [
  'vehicle-documents',
  'vehicle-photos',
  'driver-documents',
  'driver-photos',
  'repair-bills',
  'fuel-slips',
  'other',
] as const;

export type UploadFolder = (typeof UPLOAD_FOLDERS)[number];

/** Strips anything that would make a key awkward or unsafe to serve. */
function safeName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const stem = (dot > 0 ? filename.slice(0, dot) : filename)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file';
  const ext = (dot > 0 ? filename.slice(dot + 1) : '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 8);
  return ext ? `${stem}.${ext}` : stem;
}

/**
 * Builds a collision-proof object key.
 * Random suffix rather than a timestamp: two uploads in the same second from
 * different staff would otherwise land on the same key.
 */
export function buildKey(folder: UploadFolder, filename: string, ownerId?: string): string {
  const parts = [PREFIX, folder];
  if (ownerId) parts.push(ownerId);
  parts.push(`${randomBytes(6).toString('hex')}-${safeName(filename)}`);
  return parts.join('/');
}

/** Public URL for a stored object, or null if the bucket has no public base. */
export function publicUrl(key: string): string | null {
  if (!PUBLIC_BASE) return null;
  return `${PUBLIC_BASE}/${key}`;
}

/* ------------------------------------------------------------------ *
 * Operations
 * ------------------------------------------------------------------ */

/** How long a browser has to start the upload. Short: it is used immediately. */
const PUT_EXPIRY_SECONDS = 300;

export async function presignUpload(opts: {
  key: string;
  contentType: string;
  contentLength: number;
}) {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: opts.key,
    ContentType: opts.contentType,
    // Signing the length stops a presigned URL for a small file being reused to
    // push something much larger.
    ContentLength: opts.contentLength,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: PUT_EXPIRY_SECONDS });
  return { uploadUrl, key: opts.key, publicUrl: publicUrl(opts.key), expiresIn: PUT_EXPIRY_SECONDS };
}

/** Removes an object. Used when a document is replaced or detached. */
export async function deleteObject(key: string) {
  if (!key.startsWith(`${PREFIX}/`)) {
    // Guards the shared bucket: this app may only delete what it wrote.
    throw new Error('Refusing to delete an object outside this application prefix');
  }
  await getClient().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

/** Extracts the object key from a stored public URL, or null if it is foreign. */
export function keyFromUrl(url: string): string | null {
  if (!PUBLIC_BASE || !url.startsWith(`${PUBLIC_BASE}/`)) return null;
  const key = url.slice(PUBLIC_BASE.length + 1);
  return key.startsWith(`${PREFIX}/`) ? key : null;
}
