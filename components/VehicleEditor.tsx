'use client';

import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import MultiFileUpload from '@/components/MultiFileUpload';

/**
 * Inline editor for a vehicle.
 *
 * The detail page previously had an "Edit Vehicle" button wired to a state flag
 * that nothing read — the button toggled its own label and changed nothing else,
 * so registration details, document numbers and expiry dates could not be
 * corrected from the page that displayed them.
 *
 * Every stored field is here, dates included, plus the document scans.
 */

export interface VehicleLike {
  _id: string;
  name?: string;
  plate?: string;
  model?: string;
  company?: string;
  year?: number;
  status?: string;
  color?: string;
  fuelType?: string;
  mileage?: string;
  shortCode?: string;
  currentOdometer?: number | null;
  insurance?: string;
  insuranceExpiry?: string | null;
  pollution?: string;
  pollutionExpiry?: string | null;
  fitness?: string;
  fitnessExpiry?: string | null;
  rcNumber?: string;
  photoUrl?: string;
  rcDocUrls?: string[];
  insuranceDocUrls?: string[];
  pollutionDocUrls?: string[];
  fitnessDocUrls?: string[];
  permitDocUrls?: string[];
}

/** Date inputs need YYYY-MM-DD; the API returns ISO strings or null. */
const asDateInput = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 10) : '');

export default function VehicleEditor({
  vehicle, onCancel, onSaved,
}: {
  vehicle: VehicleLike;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: vehicle.name ?? '',
    plate: vehicle.plate ?? '',
    model: vehicle.model ?? '',
    company: vehicle.company ?? '',
    year: vehicle.year ?? new Date().getFullYear(),
    status: vehicle.status ?? 'available',
    color: vehicle.color ?? '',
    fuelType: vehicle.fuelType ?? '',
    mileage: vehicle.mileage ?? '',
    shortCode: vehicle.shortCode ?? '',
    currentOdometer: vehicle.currentOdometer != null ? String(vehicle.currentOdometer) : '',
    rcNumber: vehicle.rcNumber ?? '',
    insurance: vehicle.insurance ?? '',
    insuranceExpiry: asDateInput(vehicle.insuranceExpiry),
    pollution: vehicle.pollution ?? '',
    pollutionExpiry: asDateInput(vehicle.pollutionExpiry),
    fitness: vehicle.fitness ?? '',
    fitnessExpiry: asDateInput(vehicle.fitnessExpiry),
  });

  const [photoUrl, setPhotoUrl] = useState(vehicle.photoUrl ?? '');
  const [docs, setDocs] = useState<Record<string, string[]>>({
    rcDocUrls: vehicle.rcDocUrls ?? [],
    insuranceDocUrls: vehicle.insuranceDocUrls ?? [],
    pollutionDocUrls: vehicle.pollutionDocUrls ?? [],
    fitnessDocUrls: vehicle.fitnessDocUrls ?? [],
    permitDocUrls: vehicle.permitDocUrls ?? [],
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function save() {
    if (!form.name.trim() || !form.plate.trim() || !form.model.trim() || !form.rcNumber.trim()) {
      setError('Name, plate, model and RC number are required');
      return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/vehicle/${vehicle._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          ...docs,
          photoUrl,
          year: Number(form.year) || new Date().getFullYear(),
          // Blank means "not recorded", which the model stores as null rather
          // than an Invalid Date.
          insuranceExpiry: form.insuranceExpiry || null,
          pollutionExpiry: form.pollutionExpiry || null,
          fitnessExpiry: form.fitnessExpiry || null,
          currentOdometer: form.currentOdometer === '' ? null : Number(form.currentOdometer),
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
        <h2 className="text-lg font-bold" style={{ color: '#1A2332' }}>Edit vehicle</h2>
        <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <Section title="Registration">
        <Grid>
          <Field label="Name *"><Input value={form.name} onChange={set('name')} placeholder="Wagon R 6494" /></Field>
          <Field label="Registration plate *"><Input value={form.plate} onChange={set('plate')} placeholder="BR01PA6494" /></Field>
          <Field label="Model *"><Input value={form.model} onChange={set('model')} placeholder="Maruti Wagon R" /></Field>
          <Field label="RC number *"><Input value={form.rcNumber} onChange={set('rcNumber')} /></Field>
          <Field label="Year"><Input type="number" value={form.year} onChange={set('year')} /></Field>
          <Field label="Company"><Input value={form.company} onChange={set('company')} placeholder="CSC Travels" /></Field>
        </Grid>
      </Section>

      <Section title="Operating">
        <Grid>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}
              options={['available', 'in-use', 'maintenance']} />
          </Field>
          <Field label="Fuel type">
            <Select value={form.fuelType} onChange={set('fuelType')}
              options={['', 'cng', 'petrol', 'diesel', 'electric']} />
          </Field>
          <Field label="Colour"><Input value={form.color} onChange={set('color')} /></Field>
          <Field
            label="Book code (last 4)"
            hint="How the fuel and duty books name this car — the importer matches on it."
          >
            <Input value={form.shortCode} onChange={set('shortCode')} placeholder="6494" />
          </Field>
          <Field label="Current odometer">
            <Input type="number" value={form.currentOdometer} onChange={set('currentOdometer')} placeholder="31682" />
          </Field>
          <Field label="Mileage note"><Input value={form.mileage} onChange={set('mileage')} placeholder="45,230 km" /></Field>
        </Grid>
      </Section>

      <Section title="Documents" hint="Leave a date blank if it has never been recorded — blank reads as “not recorded”, not expired.">
        <Grid>
          <Field label="Insurance number"><Input value={form.insurance} onChange={set('insurance')} /></Field>
          <Field label="Insurance expiry"><Input type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} /></Field>
          <Field label="Pollution certificate"><Input value={form.pollution} onChange={set('pollution')} /></Field>
          <Field label="Pollution expiry"><Input type="date" value={form.pollutionExpiry} onChange={set('pollutionExpiry')} /></Field>
          <Field label="Fitness certificate"><Input value={form.fitness} onChange={set('fitness')} /></Field>
          <Field label="Fitness expiry"><Input type="date" value={form.fitnessExpiry} onChange={set('fitnessExpiry')} /></Field>
        </Grid>
      </Section>

      <Section title="Scans and photos" hint="Both sides where a document has them. Openable from a phone at a check post.">
        <Grid>
          <FileUpload label="Vehicle photo" folder="vehicle-photos" ownerId={vehicle._id}
            value={photoUrl} onChange={(u) => setPhotoUrl(u ?? '')} />
          <MultiFileUpload label="RC book" hint="front and back" folder="vehicle-documents" ownerId={vehicle._id}
            value={docs.rcDocUrls} onChange={(u) => setDocs({ ...docs, rcDocUrls: u })} />
          <MultiFileUpload label="Insurance" hint="all pages" folder="vehicle-documents" ownerId={vehicle._id}
            value={docs.insuranceDocUrls} onChange={(u) => setDocs({ ...docs, insuranceDocUrls: u })} />
          <MultiFileUpload label="Pollution certificate" folder="vehicle-documents" ownerId={vehicle._id}
            value={docs.pollutionDocUrls} onChange={(u) => setDocs({ ...docs, pollutionDocUrls: u })} />
          <MultiFileUpload label="Fitness certificate" folder="vehicle-documents" ownerId={vehicle._id}
            value={docs.fitnessDocUrls} onChange={(u) => setDocs({ ...docs, fitnessDocUrls: u })} />
          <MultiFileUpload label="Permit" hint="all pages" folder="vehicle-documents" ownerId={vehicle._id}
            value={docs.permitDocUrls} onChange={(u) => setDocs({ ...docs, permitDocUrls: u })} />
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

/* ------------------------------------------------------------------ */

export function Section({
  title, hint, children,
}: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="text-sm font-semibold mb-1" style={{ color: '#1A2332' }}>{title}</h3>
      {hint && <p className="text-xs mb-3" style={{ color: '#9AA5B1' }}>{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </div>
  );
}

export const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>
);

export function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs text-gray-600">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full px-3 py-2 rounded-lg text-sm"
    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
  />
);

export const Select = ({
  options, ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) => (
  <select
    {...props}
    className="w-full px-3 py-2 rounded-lg text-sm"
    style={{ border: '1px solid #E5E7EB', color: '#1A2332', outline: 'none' }}
  >
    {options.map((o) => (
      <option key={o} value={o}>{o === '' ? '— not set —' : o}</option>
    ))}
  </select>
);
