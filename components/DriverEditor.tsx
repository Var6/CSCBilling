'use client';

import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import MultiFileUpload from '@/components/MultiFileUpload';
import { Section, Grid, Field, Input, Select } from '@/components/VehicleEditor';

/**
 * Inline editor for a driver.
 *
 * Counterpart to VehicleEditor. Balances and duty counts are deliberately
 * absent: those are derived from the daily book, and letting them be typed here
 * would put a driver's float out of step with the settlements that produced it.
 */

export interface DriverLike {
  _id: string;
  name?: string;
  phone?: string;
  email?: string;
  license?: string;
  company?: string;
  status?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  joinDate?: string | null;
  baseSalary?: number;
  perKmRate?: number;
  rating?: number;
  defaultShift?: string | null;
  aliases?: string[];
  photoUrl?: string;
  licenseDocUrls?: string[];
  idProofUrls?: string[];
  policeVerificationUrls?: string[];
}

const asDateInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function DriverEditor({
  driver, onCancel, onSaved,
}: {
  driver: DriverLike;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: driver.name ?? '',
    phone: driver.phone ?? '',
    email: driver.email ?? '',
    license: driver.license ?? '',
    company: driver.company ?? '',
    status: driver.status ?? 'offline',
    address: driver.address ?? '',
    bloodGroup: driver.bloodGroup ?? '',
    emergencyContact: driver.emergencyContact ?? '',
    joinDate: asDateInput(driver.joinDate),
    baseSalary: driver.baseSalary ?? 0,
    perKmRate: driver.perKmRate ?? 0,
    rating: driver.rating ?? 0,
    defaultShift: driver.defaultShift ?? '',
    aliases: (driver.aliases ?? []).join(', '),
  });

  const [photoUrl, setPhotoUrl] = useState(driver.photoUrl ?? '');
  const [docs, setDocs] = useState<Record<string, string[]>>({
    licenseDocUrls: driver.licenseDocUrls ?? [],
    idProofUrls: driver.idProofUrls ?? [],
    policeVerificationUrls: driver.policeVerificationUrls ?? [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!form.name.trim()) { setError('A name is required'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/driver/${driver._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...docs,
          photoUrl,
          baseSalary: Number(form.baseSalary) || 0,
          perKmRate: Number(form.perKmRate) || 0,
          rating: Number(form.rating) || 0,
          joinDate: form.joinDate || null,
          defaultShift: form.defaultShift || null,
          // Edited as a comma-separated list, stored as an array. These are what
          // the importer matches on, so a missing spelling means the next import
          // creates a duplicate driver rather than updating this one.
          aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? 'Could not save');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Edit driver</h2>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <Section title="Identity">
        <Grid>
          <Field label="Full name *"><Input value={form.name} onChange={set('name')} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={set('phone')} placeholder="98765 43210" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={set('email')} /></Field>
          <Field label="Licence number"><Input value={form.license} onChange={set('license')} placeholder="BR-01-2020-1234567" /></Field>
          <Field label="Blood group"><Input value={form.bloodGroup} onChange={set('bloodGroup')} placeholder="O+" /></Field>
          <Field label="Emergency contact"><Input value={form.emergencyContact} onChange={set('emergencyContact')} /></Field>
          <Field label="Address"><Input value={form.address} onChange={set('address')} /></Field>
          <Field
            label="Also written as"
            hint="Every spelling used in the registers, comma separated."
          >
            <Input value={form.aliases} onChange={set('aliases')} placeholder="Aashish, Ashish" />
          </Field>
          <Field label="Company"><Input value={form.company} onChange={set('company')} /></Field>
        </Grid>
      </Section>

      <Section title="Employment">
        <Grid>
          <Field label="Joined on"><Input type="date" value={form.joinDate} onChange={set('joinDate')} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')} options={['available', 'on-trip', 'offline']} />
          </Field>
          <Field label="Usual shift">
            <Select value={form.defaultShift} onChange={set('defaultShift')} options={['', 'day', 'night']} />
          </Field>
          <Field label="Base salary (₹/month)">
            <Input type="number" min="0" value={form.baseSalary} onChange={set('baseSalary')} />
          </Field>
          <Field label="Per-km incentive (₹)">
            <Input type="number" min="0" step="0.01" value={form.perKmRate} onChange={set('perKmRate')} />
          </Field>
          <Field label="Rating">
            <Input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={set('rating')} />
          </Field>
        </Grid>
      </Section>

      <Section title="Documents" hint="Both sides where a document has them.">
        <Grid>
          <FileUpload label="Photo" folder="driver-photos" ownerId={driver._id}
            value={photoUrl} onChange={(u) => setPhotoUrl(u ?? '')} />
          <MultiFileUpload label="Driving licence" hint="front and back" folder="driver-documents" ownerId={driver._id}
            value={docs.licenseDocUrls} onChange={(u) => setDocs({ ...docs, licenseDocUrls: u })} />
          <MultiFileUpload label="ID proof (Aadhaar / PAN)" hint="front and back" folder="driver-documents" ownerId={driver._id}
            value={docs.idProofUrls} onChange={(u) => setDocs({ ...docs, idProofUrls: u })} />
          <MultiFileUpload label="Police verification" hint="all pages" folder="driver-documents" ownerId={driver._id}
            value={docs.policeVerificationUrls} onChange={(u) => setDocs({ ...docs, policeVerificationUrls: u })} />
        </Grid>
      </Section>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2563EB, #1E40AF)' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
