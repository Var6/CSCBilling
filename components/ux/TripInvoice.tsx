'use client';
import React from 'react';
import { MapPin, User, Phone, Car } from 'lucide-react';

interface AdditionalService {
  id: string;
  name: string;
  price: number;
}

interface CompanyInfo {
  name: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
}

interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  tripType?: 'One Way' | 'Round Trip' | 'Hourly';
  pickup: string;
  dropoff: string;
  distanceKm: number;
  ratePerKm: number;
  standbyMinutes?: number;
  discount?: number;
  gstRate?: number;               // total GST %, e.g. 5
  vehicle?: { model: string; number: string };
  driverName?: string;
  additionalServices?: AdditionalService[];
  paymentMethod?: string;
  paymentStatus?: string;
  company?: CompanyInfo | null;
  upiPaid?: number;
  notes?: string[];
}

export function TripInvoice({ data }: { data: InvoiceData }) {
  /* ---- Calculations ---- */
  const distanceAmount  = data.distanceKm * data.ratePerKm;
  const standbyCharges  = (data.standbyMinutes || 0) * 2;
  const servicesCost    = (data.additionalServices || []).reduce((s, a) => s + (a.price || 0), 0);
  const subtotal        = distanceAmount + standbyCharges + servicesCost;
  const discountAmount  = data.discount ? (subtotal * data.discount) / 100 : 0;
  const afterDiscount   = subtotal - discountAmount;

  /* GST: split 5% into CGST 2.5% + SGST 2.5% (intrastate) */
  const gstRate  = data.gstRate || 0;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const cgstAmt  = (afterDiscount * cgstRate) / 100;
  const sgstAmt  = (afterDiscount * sgstRate) / 100;
  const totalGst = cgstAmt + sgstAmt;
  const grandTotal = afterDiscount + totalGst;

  const fmt = (n: number) =>
    '₹' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const dateStr = data.date
    ? new Date(data.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  /* ---- Row counter ---- */
  let rowNo = 0;
  const nextRow = () => ++rowNo;

  return (
    <div
      id="invoice-content"
      className="max-w-3xl mx-auto bg-white shadow-lg"
      style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#1A2332' }}
    >
      {/* ===== HEADER ===== */}
      <div style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              {data.company?.name || 'csctravels'}
            </h1>
            {data.company?.address && (
              <p style={{ color: '#BFDBFE', fontSize: '11px', margin: '4px 0 0' }}>
                {data.company.address}{data.company.city ? `, ${data.company.city}` : ''}
                {data.company.state ? ` – ${data.company.state}` : ''}
              </p>
            )}
            {data.company?.phone && (
              <p style={{ color: '#BFDBFE', fontSize: '11px', margin: '2px 0 0' }}>
                Ph: {data.company.phone}
                {data.company?.email ? `  |  ${data.company.email}` : ''}
              </p>
            )}
            {(data.company?.gstin || true) && (
              <p style={{ color: '#93C5FD', fontSize: '11px', margin: '4px 0 0', fontWeight: 'bold' }}>
                GSTIN: {data.company?.gstin || '10AAHCC0614L1Z5'}
              </p>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold' }}>TAX INVOICE</div>
            <div style={{ color: '#BFDBFE', fontSize: '11px', marginTop: '6px' }}>
              <div><span style={{ fontWeight: '600' }}>Invoice No:</span> {data.invoiceNo}</div>
              <div><span style={{ fontWeight: '600' }}>Date:</span> {dateStr}</div>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    background: data.paymentStatus === 'paid' ? '#10B981' : '#F59E0B',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                  }}
                >
                  {(data.paymentStatus || 'PENDING').toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px 32px' }}>
        {/* ===== BILLED TO + TRIP DETAILS ===== */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Billed To
            </div>
            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{data.customerName}</div>
            {data.customerPhone && (
              <div style={{ color: '#5A6C7D', marginTop: '4px', fontSize: '12px' }}>
                Ph: {data.customerPhone}
              </div>
            )}
          </div>

          <div style={{ background: '#F8FAFF', border: '1px solid #DBEAFE', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              Trip Details
            </div>
            <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
              {data.tripType && <div><b>Type:</b> {data.tripType}</div>}
              {data.vehicle && (
                <div><b>Vehicle:</b> {data.vehicle.model} ({data.vehicle.number})</div>
              )}
              {data.driverName && <div><b>Driver:</b> {data.driverName}</div>}
              {data.paymentMethod && (
                <div><b>Payment:</b> {data.paymentMethod.toUpperCase()}</div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ROUTE ===== */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '32px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pickup</div>
            <div style={{ fontWeight: '600', marginTop: '3px' }}>{data.pickup}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#9CA3AF', fontSize: '20px' }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drop</div>
            <div style={{ fontWeight: '600', marginTop: '3px' }}>{data.dropoff}</div>
          </div>
        </div>

        {/* ===== CHARGES TABLE ===== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)', color: '#fff' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600', width: '40px' }}>Sl.</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600' }}>Particulars</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '600' }}>SAC</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>Qty / Unit</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>Rate</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '600' }}>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            {/* Distance */}
            <tr style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
              <td style={{ padding: '10px 12px', fontSize: '12px' }}>{nextRow()}</td>
              <td style={{ padding: '10px 12px', fontSize: '12px' }}>Distance Travel</td>
              <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6B7280' }}>996421</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>{data.distanceKm} km</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>₹{data.ratePerKm}/km</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{fmt(distanceAmount)}</td>
            </tr>

            {/* Standby */}
            {(data.standbyMinutes || 0) > 0 && (
              <tr style={{ background: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{nextRow()}</td>
                <td style={{ padding: '10px 12px', fontSize: '12px' }}>Stand-by / Waiting Charges</td>
                <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6B7280' }}>996421</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>{data.standbyMinutes} min</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>₹2/min</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{fmt(standbyCharges)}</td>
              </tr>
            )}

            {/* Additional services */}
            {(data.additionalServices || []).map(svc => (
              <tr key={svc.id} style={{ background: '#fff', borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{nextRow()}</td>
                <td style={{ padding: '10px 12px', fontSize: '12px' }}>{svc.name}</td>
                <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6B7280' }}>996421</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>1</td>
                <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px' }}>₹{svc.price}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', fontWeight: '600' }}>{fmt(svc.price)}</td>
              </tr>
            ))}

            {/* Subtotal */}
            <tr style={{ background: '#F8F9FA', borderTop: '2px solid #E5E7EB' }}>
              <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>Subtotal</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>{fmt(subtotal)}</td>
            </tr>

            {/* Discount */}
            {(data.discount || 0) > 0 && (
              <tr style={{ background: '#fff' }}>
                <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontSize: '12px', color: '#EF4444' }}>
                  Discount @{data.discount}%
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontSize: '12px', color: '#EF4444' }}>
                  -{fmt(discountAmount)}
                </td>
              </tr>
            )}

            {/* Taxable value */}
            <tr style={{ background: '#F8F9FA' }}>
              <td colSpan={5} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>Taxable Value</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>{fmt(afterDiscount)}</td>
            </tr>

            {/* CGST */}
            {gstRate > 0 && (
              <tr style={{ background: '#fff' }}>
                <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
                  CGST @ {cgstRate}%
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>{fmt(cgstAmt)}</td>
              </tr>
            )}

            {/* SGST */}
            {gstRate > 0 && (
              <tr style={{ background: '#FAFAFA' }}>
                <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
                  SGST @ {sgstRate}%
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>{fmt(sgstAmt)}</td>
              </tr>
            )}

            {/* Total GST */}
            {gstRate > 0 && (
              <tr style={{ background: '#EFF6FF' }}>
                <td colSpan={5} style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', fontSize: '12px' }}>
                  Total GST ({gstRate}%)
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700', fontSize: '12px' }}>{fmt(totalGst)}</td>
              </tr>
            )}

            {/* Grand Total */}
            <tr style={{ background: 'linear-gradient(135deg, #1E40AF, #2563EB)', color: '#fff' }}>
              <td colSpan={5} style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                GRAND TOTAL
              </td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 'bold', fontSize: '15px' }}>
                {fmt(grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ===== GST SUMMARY BOX ===== */}
        {gstRate > 0 && (
          <div style={{ border: '1px solid #DBEAFE', borderRadius: '8px', padding: '14px', marginBottom: '20px', background: '#F8FAFF' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
              GST Summary
            </div>
            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#DBEAFE' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>SAC Code</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Description</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Taxable Value</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>CGST {cgstRate}%</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>SGST {sgstRate}%</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Total Tax</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #BFDBFE' }}>
                  <td style={{ padding: '6px 10px' }}>996421</td>
                  <td style={{ padding: '6px 10px' }}>Road Transport Services</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(afterDiscount)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(cgstAmt)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right' }}>{fmt(sgstAmt)}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700' }}>{fmt(totalGst)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ===== NOTES ===== */}
        <div style={{ marginBottom: '20px', fontSize: '11px', color: '#6B7280', lineHeight: '1.7' }}>
          <div style={{ fontWeight: '600', color: '#1A2332', marginBottom: '4px' }}>Terms & Notes:</div>
          <div>• Stand-by charges of ₹2 per minute apply after 15 minutes of waiting.</div>
          <div>• This is a computer-generated tax invoice. No signature required.</div>
          {(data.notes || []).map((note, i) => <div key={i}>• {note}</div>)}
        </div>

        {/* ===== FOOTER / SIGNATURE ===== */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '16px', borderTop: '2px solid #E5E7EB' }}>
          <div>
            {data.upiPaid && (
              <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#10B981' }}>
                UPI Paid: {fmt(data.upiPaid)}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
              Subject to {data.company?.city || 'jurisdiction'} Jurisdiction
            </div>
          </div>
          <div style={{ textAlign: 'center', minWidth: '180px' }}>
            <div style={{ height: '48px' }} />
            <div style={{ borderTop: '2px solid #1A2332', paddingTop: '6px' }}>
              <div style={{ fontWeight: '600', fontSize: '12px' }}>
                For {data.company?.name || 'csctravels'}
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
