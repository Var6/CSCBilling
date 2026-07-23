import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { requireSession } from '@/lib/apiAuth';
import {
  buildKey, publicUrl, r2Configured, R2_BUCKET, getR2Client,
  UPLOAD_FOLDERS, type UploadFolder,
} from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Server-side upload, used when the browser cannot PUT to R2 directly.
 *
 * The direct presigned path is better — no size ceiling, no bytes through this
 * function — but it needs a CORS rule on the bucket, and setting that requires
 * an Admin-scoped R2 token. Until the bucket allows the console's origin, a
 * browser PUT fails preflight and surfaces to staff as "connection error".
 *
 * So this exists as a fallback: the file is posted here and relayed to R2 from
 * the server, where CORS does not apply. The cost is the platform request-body
 * ceiling, which is why anything larger is refused with an explanation rather
 * than a generic failure.
 */

/**
 * Vercel caps a serverless request body at 4.5 MB. Leave headroom for the
 * multipart envelope so a file just under the limit does not fail opaquely.
 */
const MAX_PROXY_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
];

export async function POST(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  if (!r2Configured()) {
    return NextResponse.json(
      { error: 'File storage is not configured. Set the R2_* environment variables.' },
      { status: 503 },
    );
  }

  try {
    const form = await req.formData();
    const file = form.get('file');
    const folder = String(form.get('folder') ?? '');
    const ownerId = form.get('ownerId') ? String(form.get('ownerId')) : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was received' }, { status: 400 });
    }
    if (!UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
      return NextResponse.json(
        { error: `folder must be one of: ${UPLOAD_FOLDERS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only images and PDFs can be uploaded' }, { status: 400 });
    }
    if (file.size > MAX_PROXY_BYTES) {
      return NextResponse.json(
        {
          error:
            `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Files over 4 MB need a ` +
            'CORS rule on the R2 bucket so the browser can upload straight to it.',
          needsCors: true,
        },
        { status: 413 },
      );
    }

    const key = buildKey(folder as UploadFolder, file.name, ownerId ?? String(auth.companyId));

    /*
     * The shared client, not a locally built one. Reading R2_ENDPOINT directly
     * here was a bug: the value has been pasted with quotes inside the URL, and
     * only lib/r2.ts strips them — so this route resolved a hostname containing
     * literal quote characters and failed with ENOTFOUND.
     */
    await getR2Client().send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
    }));

    return NextResponse.json({ key, publicUrl: publicUrl(key), via: 'server' });
  } catch (err) {
    console.error('POST /api/uploads/direct failed:', err);
    return NextResponse.json({ error: 'The upload could not be stored' }, { status: 500 });
  }
}
