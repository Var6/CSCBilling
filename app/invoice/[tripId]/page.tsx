
// ============================================
// 3. INVOICE PAGE (app/invoice/[tripId]/page.tsx)
// ============================================
'use client';
import { use, useEffect, useState } from 'react';
import { TripInvoice } from '@/components/ux/TripInvoice';
import { Printer, Download, Loader } from 'lucide-react';

export default function InvoicePage({ params }: { params: Promise<{ tripId: string }> }) {
  const resolvedParams = use(params);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [resolvedParams.tripId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoice/${resolvedParams.tripId}`);
      if (response.ok) {
        const data = await response.json();
        setInvoiceData(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    // Option 1: Client-side PDF generation using browser print
    window.print();
    
    // Option 2: Server-side PDF generation (requires puppeteer)
    // const response = await fetch(`/api/invoice/${resolvedParams.tripId}/pdf`);
    // const blob = await response.blob();
    // const url = window.URL.createObjectURL(blob);
    // const a = document.createElement('a');
    // a.href = url;
    // a.download = `invoice-${resolvedParams.tripId}.pdf`;
    // a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#2563EB' }} />
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invoice not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Action Buttons - Hidden in print */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-end gap-3 print:hidden px-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all"
          style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
        >
          <Printer className="w-5 h-5" />
          Print Invoice
        </button>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium shadow-sm hover:shadow-md transition-all"
          style={{ border: '1px solid #2563EB', color: '#2563EB' }}
        >
          <Download className="w-5 h-5" />
          Download PDF
        </button>
      </div>

      <TripInvoice data={invoiceData} />
    </div>
  );
}
