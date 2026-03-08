'use client';
import React, { useEffect, useState, use, useRef } from 'react';
import { TripInvoice } from '@/components/ux/TripInvoice';
import { Printer, Download, Loader, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InvoicePage({ params }: { params: Promise<{ tripId: string }> }) {
  const resolvedParams = use(params);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoice/${resolvedParams.tripId}`);
        if (response.ok) {
          const data = await response.json();
          setInvoiceData(data);
        } else {
          setError('Invoice not found');
        }
      } catch {
        setError('Failed to load invoice');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [resolvedParams.tripId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  if (error || !invoiceData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || 'Invoice not found'}</p>
        <Link href="/Dashboard/Trip/Booking" className="text-blue-600 hover:underline text-sm">
          ← Back to Trips
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          #invoice-content { box-shadow: none !important; }
        }
      `}</style>

      <div className="min-h-screen py-8" style={{ backgroundColor: '#F8F9FA' }}>
        {/* Action bar - hidden on print */}
        <div className="no-print max-w-3xl mx-auto mb-5 px-4 flex items-center justify-between">
          <Link
            href="/Dashboard/Trip/Booking"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: '#5A6C7D' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trips
          </Link>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all text-sm"
              style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm hover:shadow-md transition-all text-sm"
              style={{ border: '1px solid #2563EB', color: '#2563EB' }}
              title="Use browser's Print → Save as PDF"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>

        <TripInvoice data={invoiceData} />

        {/* PDF hint */}
        <p className="no-print text-center text-xs mt-4" style={{ color: '#9CA3AF' }}>
          To save as PDF: Click Print → choose "Save as PDF" as destination
        </p>
      </div>
    </>
  );
}
