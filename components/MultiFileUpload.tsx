'use client';

import { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, ExternalLink, Plus } from 'lucide-react';
import type { UploadFolder } from '@/components/FileUpload';

/**
 * Attaches several files to one document field.
 *
 * A licence, an Aadhaar card and an RC book all have two sides, and a single
 * slot per document meant staff had to choose which half to keep. Insurance and
 * permits often run to several pages besides.
 *
 * Pages stay in the order they were added, so front-then-back reads correctly,
 * and each can be removed individually without disturbing the rest.
 */

interface Props {
  /** Stored URLs, in display order. */
  value?: string[] | null;
  onChange: (urls: string[]) => void;
  folder: UploadFolder;
  ownerId?: string;
  label?: string;
  /** Shown under the label, e.g. "front and back". */
  hint?: string;
  accept?: string;
  max?: number;
  disabled?: boolean;
}

const MAX_MB = 15;

export default function MultiFileUpload({
  value, onChange, folder, ownerId, label, hint,
  accept = 'image/*,application/pdf', max = 6, disabled,
}: Props) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const files = value ?? [];

  /** Uploads one file and returns its stored URL. */
  async function uploadOne(file: File): Promise<string> {
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
        // A blocked CORS preflight looks the same as a dropped connection here.
        xhr.onerror = () => reject(new Error('DIRECT_UPLOAD_BLOCKED'));
        xhr.send(file);
      });
      if (!signed.publicUrl) throw new Error('Uploaded, but the bucket has no public URL');
      return signed.publicUrl;
    } catch (e) {
      if ((e as Error).message !== 'DIRECT_UPLOAD_BLOCKED') throw e;

      // The bucket has no CORS rule for this origin — relay through the server.
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      if (ownerId) fd.append('ownerId', ownerId);
      const relay = await fetch('/api/uploads/direct', { method: 'POST', body: fd });
      const relayed = await relay.json().catch(() => ({}));
      if (!relay.ok) throw new Error(relayed.error ?? 'The upload failed');
      if (!relayed.publicUrl) throw new Error('Uploaded, but the bucket has no public URL');
      return relayed.publicUrl as string;
    }
  }

  async function addFiles(chosen: FileList) {
    setError(null);
    const room = max - files.length;
    if (room <= 0) { setError(`Up to ${max} files here.`); return; }

    const batch = Array.from(chosen).slice(0, room);
    const tooBig = batch.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setError(`${tooBig.name} is over the ${MAX_MB} MB limit.`);
      return;
    }

    setBusy(true);
    const added: string[] = [];
    try {
      // Sequential rather than parallel: several phone photos at once would
      // otherwise saturate a slow connection and time each other out.
      for (const f of batch) {
        setProgress(0);
        added.push(await uploadOne(f));
      }
      onChange([...files, ...added]);
    } catch (e) {
      // Keep whatever did upload — losing three good pages because the fourth
      // failed would mean scanning them all again.
      if (added.length) onChange([...files, ...added]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setProgress(0);
      if (input.current) input.current.value = '';
    }
  }

  function removeAt(index: number) {
    const url = files[index];
    onChange(files.filter((_, i) => i !== index));
    // Best effort; the record has already dropped its reference.
    fetch(`/api/uploads/sign?url=${encodeURIComponent(url)}`, { method: 'DELETE' }).catch(() => {});
  }

  const isImage = (u: string) => /\.(jpe?g|png|webp|heic|heif)(\?|$)/i.test(u);

  return (
    <div>
      {label && (
        <span className="block mb-1 text-xs text-gray-600">
          {label}
          {files.length > 0 && <span className="text-gray-400"> · {files.length}</span>}
        </span>
      )}
      {hint && <span className="block mb-1 text-[11px] text-gray-400">{hint}</span>}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {files.map((url, i) => (
            <div key={url} className="relative group">
              <a href={url} target="_blank" rel="noopener noreferrer" title={`Page ${i + 1}`}>
                {isImage(url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={`Page ${i + 1}`}
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <span className="w-16 h-16 rounded-lg border border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <ExternalLink className="w-3 h-3 text-gray-300 mt-0.5" />
                  </span>
                )}
              </a>
              <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center text-white bg-black/50 rounded-b-lg">
                {i === 0 ? 'front' : i === 1 ? 'back' : `p${i + 1}`}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove this page"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!disabled && files.length < max && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {busy ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{progress > 0 ? `Uploading ${progress}%` : 'Uploading…'}</>
          ) : files.length === 0 ? (
            <><Upload className="w-4 h-4" /> Choose files</>
          ) : (
            <><Plus className="w-4 h-4" /> Add another page</>
          )}
        </button>
      )}

      <input
        ref={input}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }}
      />

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
