import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/lib/apiAuth';
import {
  buildKey, presignUpload, r2Configured, deleteObject, keyFromUrl,
  UPLOAD_FOLDERS, type UploadFolder,
} from '@/lib/r2';

export const dynamic = 'force-dynamic';

/**
 * Hands the browser a short-lived URL to upload one file straight to R2.
 *
 * POST /api/uploads/sign  { folder, filename, contentType, size, ownerId? }
 *   -> { uploadUrl, key, publicUrl }
 *
 * DELETE /api/uploads/sign?url=<public url>   removes a stored file.
 *
 * The file never passes through this function — only the permission to write
 * one does. That keeps uploads clear of the 4.5 MB serverless body limit and
 * keeps the R2 credentials on the server.
 */

/** What staff actually attach here: document scans and photos. */
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
  'application/pdf',
];

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — ample for a phone photo or a scan

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
    const body = await req.json();
    const { folder, filename, contentType, size, ownerId } = body ?? {};

    if (!UPLOAD_FOLDERS.includes(folder as UploadFolder)) {
      return NextResponse.json(
        { error: `folder must be one of: ${UPLOAD_FOLDERS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Only images and PDFs can be uploaded' },
        { status: 400 },
      );
    }

    const bytes = Number(size);
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return NextResponse.json({ error: 'A valid file size is required' }, { status: 400 });
    }
    if (bytes > MAX_BYTES) {
      return NextResponse.json(
        { error: `That file is ${(bytes / 1024 / 1024).toFixed(1)} MB. The limit is 15 MB.` },
        { status: 413 },
      );
    }

    // Namespaced per company so one tenant's uploads cannot be guessed from
    // another's key layout.
    const key = buildKey(
      folder as UploadFolder,
      filename,
      ownerId ? String(ownerId) : String(auth.companyId),
    );

    const signed = await presignUpload({ key, contentType, contentLength: bytes });
    return NextResponse.json(signed);
  } catch (err) {
    console.error('POST /api/uploads/sign failed:', err);
    return NextResponse.json({ error: 'Could not prepare the upload' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireSession(req);
  if ('response' in auth) return auth.response;

  try {
    const url = new URL(req.url).searchParams.get('url');
    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const key = keyFromUrl(url);
    if (!key) {
      // Either not ours or not in this app's prefix — refuse rather than risk
      // deleting another project's file from the shared bucket.
      return NextResponse.json(
        { error: 'That file was not uploaded by this application' },
        { status: 400 },
      );
    }

    await deleteObject(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/uploads/sign failed:', err);
    return NextResponse.json({ error: 'Could not delete the file' }, { status: 500 });
  }
}
