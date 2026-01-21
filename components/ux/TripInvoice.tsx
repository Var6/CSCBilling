// ============================================
// 1. INVOICE COMPONENT (components/TripInvoice.tsx)
// ============================================
'use client';
import React from 'react';
import { Calendar, MapPin, User, Phone, Car, FileText } from 'lucide-react';

interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  tripType: 'One Way' | 'Round Trip' | 'Hourly';
  pickup: string;
  dropoff: string;
  distanceKm: number;
  ratePerKm: number;
  timeMinutes?: number;
  ratePerMinute?: number;
  standbyMinutes?: number;
  discount?: number;
  gstRate?: number;
  upiPaid?: number;
  vehicle?: {
  model: string;
  number: string;
  vehicleId?: string;
};
  driverName?: string;
  notes?: string[];
}

export function TripInvoice({ data }: { data: InvoiceData }) {
  // Calculations
  const distanceAmount = data.distanceKm * data.ratePerKm;
  const timeAmount = data.timeMinutes && data.ratePerMinute 
    ? data.timeMinutes * data.ratePerMinute 
    : 0;
  const standbyCharges = data.standbyMinutes ? data.standbyMinutes * 2 : 0;
  
  const subtotal = distanceAmount + timeAmount + standbyCharges;
  const discountAmount = data.discount ? (subtotal * data.discount) / 100 : 0;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = data.gstRate ? (afterDiscount * data.gstRate) / 100 : 0;
  const total = afterDiscount + gstAmount;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg" id="invoice-content">
      {/* Header */}
      <div className="border-b-4 pb-6 mb-6" style={{ borderColor: '#2563EB' }}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#1A2332' }}>
              CSC TRAVELS SERVICES PVT. LTD.
            </h1>
            <p className="text-sm" style={{ color: '#5A6C7D' }}>
              GSTIN: 10AAHCC0614L1Z5
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#2563EB' }}>
              TRIP INVOICE
            </h2>
            <div className="text-sm space-y-1" style={{ color: '#5A6C7D' }}>
              <p><span className="font-semibold">No.:</span> {data.invoiceNo}</p>
              <p><span className="font-semibold">Date:</span> {new Date(data.date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer & Trip Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold mb-3" style={{ color: '#1A2332' }}>Customer Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: '#2563EB' }} />
              <span><span className="font-semibold">Name:</span> {data.customerName}</span>
            </div>
            {data.customerPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: '#2563EB' }} />
                <span><span className="font-semibold">Phone:</span> {data.customerPhone}</span>
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className="font-bold mb-3" style={{ color: '#1A2332' }}>Trip Details</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-semibold">Trip Type:</span> {data.tripType}</p>
           {data.vehicle && (
  <div className="flex items-center gap-2">
    <Car className="w-4 h-4" style={{ color: '#2563EB' }} />
    <span>
      <span className="font-semibold">Vehicle:</span>{' '}
      {data.vehicle.model} ({data.vehicle.number})
    </span>
  </div>
)}
            {data.driverName && (
              <p><span className="font-semibold">Driver:</span> {data.driverName}</p>
            )}
          </div>
        </div>
      </div>

      {/* Route */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4" style={{ color: '#10B981' }} />
              <span className="font-semibold text-sm" style={{ color: '#5A6C7D' }}>Pickup</span>
            </div>
            <p style={{ color: '#1A2332' }}>{data.pickup}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4" style={{ color: '#EF4444' }} />
              <span className="font-semibold text-sm" style={{ color: '#5A6C7D' }}>Drop</span>
            </div>
            <p style={{ color: '#1A2332' }}>{data.dropoff}</p>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ backgroundColor: '#F8F9FA' }}>
              <th className="border p-3 text-left text-sm font-semibold" style={{ color: '#5A6C7D', borderColor: '#E5E7EB' }}>
                Sl.No.
              </th>
              <th className="border p-3 text-left text-sm font-semibold" style={{ color: '#5A6C7D', borderColor: '#E5E7EB' }}>
                Particulars
              </th>
              <th className="border p-3 text-center text-sm font-semibold" style={{ color: '#5A6C7D', borderColor: '#E5E7EB' }}>
                in KM / TIME
              </th>
              <th className="border p-3 text-center text-sm font-semibold" style={{ color: '#5A6C7D', borderColor: '#E5E7EB' }}>
                Rate/km or min
              </th>
              <th className="border p-3 text-right text-sm font-semibold" style={{ color: '#5A6C7D', borderColor: '#E5E7EB' }}>
                Amount (Rs.)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>1</td>
              <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>Distance Travel</td>
              <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>{data.distanceKm}</td>
              <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>{data.ratePerKm}</td>
              <td className="border p-3 text-right text-sm font-semibold" style={{ borderColor: '#E5E7EB' }}>
                {distanceAmount.toFixed(2)}
              </td>
            </tr>
            
            {data.timeMinutes && data.ratePerMinute && (
              <tr>
                <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>2</td>
                <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>Time Charges</td>
                <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>{data.timeMinutes} min</td>
                <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>{data.ratePerMinute}</td>
                <td className="border p-3 text-right text-sm font-semibold" style={{ borderColor: '#E5E7EB' }}>
                  {timeAmount.toFixed(2)}
                </td>
              </tr>
            )}

            {standbyCharges > 0 && (
              <tr>
                <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>
                  {data.timeMinutes ? '3' : '2'}
                </td>
                <td className="border p-3 text-sm" style={{ borderColor: '#E5E7EB' }}>Standby Charges</td>
                <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>
                  {data.standbyMinutes} min
                </td>
                <td className="border p-3 text-center text-sm" style={{ borderColor: '#E5E7EB' }}>2</td>
                <td className="border p-3 text-right text-sm font-semibold" style={{ borderColor: '#E5E7EB' }}>
                  {standbyCharges.toFixed(2)}
                </td>
              </tr>
            )}

            <tr style={{ backgroundColor: '#F8F9FA' }}>
              <td colSpan={4} className="border p-3 text-right font-semibold" style={{ borderColor: '#E5E7EB' }}>
                Subtotal
              </td>
              <td className="border p-3 text-right font-bold" style={{ borderColor: '#E5E7EB', color: '#1A2332' }}>
                {subtotal.toFixed(2)}
              </td>
            </tr>

            {data.discount && (
              <tr>
                <td colSpan={4} className="border p-3 text-right" style={{ borderColor: '#E5E7EB' }}>
                  Discount @{data.discount}%
                </td>
                <td className="border p-3 text-right font-semibold" style={{ borderColor: '#E5E7EB', color: '#EF4444' }}>
                  -{discountAmount.toFixed(2)}
                </td>
              </tr>
            )}

            <tr style={{ backgroundColor: '#F8F9FA' }}>
              <td colSpan={4} className="border p-3 text-right font-semibold" style={{ borderColor: '#E5E7EB' }}>
                Sub Total
              </td>
              <td className="border p-3 text-right font-bold" style={{ borderColor: '#E5E7EB', color: '#1A2332' }}>
                {afterDiscount.toFixed(2)}
              </td>
            </tr>

            {data.gstRate && (
              <tr>
                <td colSpan={4} className="border p-3 text-right" style={{ borderColor: '#E5E7EB' }}>
                  GST @{data.gstRate}%
                </td>
                <td className="border p-3 text-right font-semibold" style={{ borderColor: '#E5E7EB' }}>
                  {gstAmount.toFixed(2)}
                </td>
              </tr>
            )}

            <tr style={{ backgroundColor: '#DBEAFE' }}>
              <td colSpan={4} className="border p-3 text-right font-bold text-lg" style={{ borderColor: '#2563EB', color: '#1A2332' }}>
                Total
              </td>
              <td className="border p-3 text-right font-bold text-lg" style={{ borderColor: '#2563EB', color: '#2563EB' }}>
                {total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {(data.notes || data.upiPaid) && (
        <div className="mb-6 space-y-2">
          <h3 className="font-bold" style={{ color: '#1A2332' }}>Note:</h3>
          <ul className="text-sm space-y-1" style={{ color: '#5A6C7D' }}>
            {data.notes?.map((note, idx) => (
              <li key={idx}>• {note}</li>
            ))}
            {!data.notes?.some(n => n.includes('Stand-by')) && (
              <li>• Stand-by charges of Rs. 2 per minute will apply after 15min.</li>
            )}
          </ul>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between items-end pt-6 border-t" style={{ borderColor: '#E5E7EB' }}>
        <div>
          {data.upiPaid && (
            <p className="font-bold text-lg" style={{ color: '#10B981' }}>
              UPI paid Rs. {data.upiPaid.toFixed(2)}
            </p>
          )}
        </div>
        <div className="text-center">
          <div className="border-t-2 pt-2 mt-12" style={{ borderColor: '#1A2332', minWidth: '200px' }}>
            <p className="font-semibold">Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================
// 4. USAGE IN TRIP DETAILS PAGE
// ============================================
// Add this button to your trip details page:
/*
import { FileText } from 'lucide-react';
import Link from 'next/link';

<Link href={`/invoice/${trip.tripId}`} target="_blank">
  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:shadow-md"
    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
    <FileText className="w-4 h-4" />
    Generate Invoice
  </button>
</Link>
*/
