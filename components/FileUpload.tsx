'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * Attaches a document or photo to a record.
 *
 * The browser asks the server for a short-lived presigned URL and then PUTs the
 * file straight to R2. Nothing large passes through the app, so a 10 MB scan of
 * an RC book uploads exactly as easily as a small photo.
 *
 * The component owns the upload only. It hands back the stored URL and lets the
 * parent decide when to persist it, so a half-finished form never leaves a
 * dangling reference on a record.
 */

export type UploadFolder =
  | 'vehicle-documents' | 'vehicle-photos'
  | 'driver-documents' | 'driver-photos'
  | 'repair-bills' | 'fuel-slips' | 'other';

interface Props {
  /** Current stored URL, if a file is already attached. */
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: UploadFolder;
  /** Groups files by the record they belong to. */
  ownerId?: string;
  label?: string;
  accept?: string;
  disabled?: boolean;
}

const MAX_MB = 15;

export default function FileUpload({
  value, onChange, folder, ownerId, label = 'Attach a file',
  accept = 'image/*,application/pdf', disabled,
}: Props) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function upload(file: File) {
    setError(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is ${MAX_MB} MB.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    try {
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder,
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          ownerId,
        }),
      });
      const signed = await signRes.json().catch(() => ({}));
      if (!signRes.ok) throw new Error(signed.error ?? 'Could not prepare the upload');

      /*
       * XMLHttpRequest rather than fetch: it reports upload progress, and a
       * document scan on a phone connection takes long enough that a silent
       * spinner reads as a hang.
       */
      let storedUrl: string | null = null;
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', signed.uploadUrl);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.onload = () =>
            xhr.status >= 200 && xhr.status < 300
              ? resolve()
              : reject(new Error(`Upload rejected by storage (${xhr.status})`));
          // A blocked CORS preflight is indistinguishable from a dropped
          // connection here — the browser reports both as a bare network error.
          xhr.onerror = () => reject(new Error('DIRECT_UPLOAD_BLOCKED'));
          xhr.send(file);
        });
        storedUrl = signed.publicUrl ?? null;
      } catch (directErr) {
        if ((directErr as Error).message !== 'DIRECT_UPLOAD_BLOCKED') throw directErr;

        /*
         * The bucket has no CORS rule allowing this origin, so the browser
         * cannot talk to R2 itself. Relay through the server instead, which is
         * not subject to CORS. Slower and size-limited, but it works today
         * without anyone having to change bucket settings first.
         */
        setProgress(0);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', folder);
        if (ownerId) fd.append('ownerId', ownerId);

        const relay = await fetch('/api/uploads/direct', { method: 'POST', body: fd });
        const relayed = await relay.json().catch(() => ({}));
        if (!relay.ok) throw new Error(relayed.error ?? 'The upload failed');
        storedUrl = relayed.publicUrl ?? null;
      }

      if (!storedUrl) {
        throw new Error('Uploaded, but the bucket has no public URL configured');
      }

      /*
       * Replacing: the old file is removed only now that the new one is stored.
       * Deleting first — which is what "remove, then choose again" did — loses
       * the original outright if the second upload fails, and the original is
       * often the only copy of a document.
       */
      const previous = value;
      onChange(storedUrl);
      if (previous && previous !== storedUrl) {
        fetch(`/api/uploads/sign?url=${encodeURIComponent(previous)}`, { method: 'DELETE' })
          .catch(() => { /* the record already points at the new file */ });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(0);
      if (input.current) input.current.value = '';
    }
  }

  async function remove() {
    if (!value) return;
    setBusy(true);
    try {
      // Best effort: if storage deletion fails the record should still be able
      // to drop its reference, otherwise a bad file is stuck on it forever.
      await fetch(`/api/uploads/sign?url=${encodeURIComponent(value)}`, { method: 'DELETE' });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      onChange(null);
    }
  }

  const isImage = value ? /\.(jpe?g|png|webp|heic|heif)$/i.test(value) : false;

  return (
    <div>
      {label && <span className="block mb-1 text-xs text-gray-600">{label}</span>}

      {value ? (
        <div className="flex items-center gap-3 p-2 rounded-lg border border-gray-200 bg-gray-50">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded bg-white border border-gray-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gray-400" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="block text-sm text-blue-600 hover:underline truncate">
              {decodeURIComponent(value.split('/').pop() ?? 'file')}
              <ExternalLink className="w-3 h-3 inline ml-1 shrink-0" />
            </a>
            {busy && (
              <span className="block text-[11px] text-gray-500">
                {progress > 0 ? `Replacing — ${progress}%` : 'Replacing…'}
              </span>
            )}
          </div>
          {!disabled && (
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => input.current?.click()} disabled={busy}
                className="p-1.5 rounded hover:bg-gray-100 text-gray-500" title="Replace with another file">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
              <button type="button" onClick={remove} disabled={busy}
                className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Remove">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={disabled || busy}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress > 0 ? `Uploading ${progress}%` : 'Preparing…'}
            </>
          ) : (
            <><Upload className="w-4 h-4" /> Choose a file</>
          )}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
        }}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
