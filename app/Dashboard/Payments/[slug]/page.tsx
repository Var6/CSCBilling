'use client';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, Printer, Edit, Trash2, CheckCircle, XCircle, Clock, DollarSign, Calendar, User, Car, FileText, MapPin, CreditCard, Tag, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function PaymentDetailPage({ params }: { params: { id: string } }) {
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  // Mock data - Replace with actual API call using params.id
  useEffect(() => {
    const fetchTransaction = async () => {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setTransaction({
          id: 'TXN001',
          transactionNumber: 'PAY-2025-001234',
          date: '2025-01-22',
          time: '14:30:00',
          type: 'income',
          category: 'Trip Revenue',
          subCategory: 'Airport Transfer',
          description: 'Trip #12345 - Airport Transfer from Downtown to JFK',
          amount: 450.00,
          paymentMethod: 'Credit Card',
          paymentReference: 'CH_3QX4Y2Z9',
          status: 'completed',
          
          // Related entities
          driver: {
            id: 'DRV001',
            name: 'John Doe',
            phone: '+1 (555) 123-4567',
            email: 'john.doe@csctravels.com',
            licenseNumber: 'DL123456'
          },
          vehicle: {
            id: 'VEH001',
            model: 'Toyota Camry',
            number: 'ABC123',
            year: '2023',
            color: 'Black'
          },
          customer: {
            id: 'CUST001',
            name: 'Sarah Williams',
            phone: '+1 (555) 987-6543',
            email: 'sarah.williams@email.com'
          },
          trip: {
            id: 'TRIP12345',
            pickup: 'Downtown Plaza, 123 Main St',
            dropoff: 'JFK Airport, Terminal 4',
            distance: '25.4 miles',
            duration: '45 minutes'
          },
          
          // Financial breakdown
          breakdown: {
            baseFare: 350.00,
            tip: 50.00,
            tax: 35.00,
            serviceFee: 15.00,
            total: 450.00
          },
          
          // Additional info
          notes: 'Customer requested child seat. Smooth ride with no issues.',
          createdBy: 'Admin',
          createdAt: '2025-01-22T14:30:00Z',
          updatedAt: '2025-01-22T14:30:00Z',
          
          // Audit trail
          auditTrail: [
            { action: 'Created', user: 'System', timestamp: '2025-01-22T14:30:00Z' },
            { action: 'Payment Received', user: 'Payment Gateway', timestamp: '2025-01-22T14:31:15Z' },
            { action: 'Completed', user: 'System', timestamp: '2025-01-22T15:15:00Z' }
          ]
        });
        setLoading(false);
      }, 500);
    };

    fetchTransaction();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: '#2563EB' }}></div>
          <p style={{ color: '#5A6C7D' }}>Loading transaction details...</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A2332' }}>Transaction Not Found</h2>
          <p className="mb-6" style={{ color: '#5A6C7D' }}>The transaction you're looking for doesn't exist.</p>
          <Link href="/Dashboard/Payments" className="px-6 py-3 rounded-lg text-white font-medium inline-flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
            <ArrowLeft className="w-5 h-5" />
            Back to Payments
          </Link>
        </div>
      </div>
    );
  }

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'completed':
        return { icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Completed' };
      case 'pending':
        return { icon: Clock, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Pending' };
      case 'failed':
        return { icon: XCircle, bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Failed' };
      default:
        return { icon: Clock, bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: 'Unknown' };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="mb-8">
        <Link href="/Dashboard/Payments" className="inline-flex items-center gap-2 mb-4 text-sm font-medium hover:underline" style={{ color: '#2563EB' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to Payments
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>
              Transaction Details
            </h1>
            <p style={{ color: '#5A6C7D' }}>{transaction.transactionNumber}</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}>
              <Download className="w-5 h-5" />
              Download
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}>
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium shadow-sm hover:shadow-md transition-all" style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}>
              <Edit className="w-5 h-5" />
              Edit
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Transaction Overview */}
          <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#1A2332' }}>Transaction Overview</h2>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Transaction Type</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${transaction.type === 'income' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {transaction.type === 'income' ? 'Income' : 'Expense'}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} flex items-center gap-2`}>
                    <StatusIcon className="w-4 h-4" />
                    {statusConfig.label}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Category</p>
                <p className="font-semibold" style={{ color: '#1A2332' }}>{transaction.category}</p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>{transaction.subCategory}</p>
              </div>
              
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Amount</p>
                <p className={`text-2xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                  {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                </p>
              </div>
              
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Date & Time</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                  <div>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.date}</p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>{transaction.time}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Payment Method</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" style={{ color: '#5A6C7D' }} />
                  <div>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.paymentMethod}</p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>{transaction.paymentReference}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid #E5E7EB' }}>
              <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Description</p>
              <p style={{ color: '#1A2332' }}>{transaction.description}</p>
            </div>
          </div>

          {/* Financial Breakdown */}
          {transaction.breakdown && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: '#1A2332' }}>Financial Breakdown</h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#5A6C7D' }}>Base Fare</span>
                  <span className="font-medium" style={{ color: '#1A2332' }}>${transaction.breakdown.baseFare.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#5A6C7D' }}>Tip</span>
                  <span className="font-medium" style={{ color: '#1A2332' }}>${transaction.breakdown.tip.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#5A6C7D' }}>Tax</span>
                  <span className="font-medium" style={{ color: '#1A2332' }}>${transaction.breakdown.tax.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <span style={{ color: '#5A6C7D' }}>Service Fee</span>
                  <span className="font-medium" style={{ color: '#1A2332' }}>${transaction.breakdown.serviceFee.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between py-4 mt-2" style={{ borderTop: '2px solid #E5E7EB' }}>
                  <span className="text-lg font-bold" style={{ color: '#1A2332' }}>Total</span>
                  <span className="text-2xl font-bold" style={{ color: '#2563EB' }}>${transaction.breakdown.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Trip Details */}
          {transaction.trip && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h2 className="text-xl font-bold mb-6" style={{ color: '#1A2332' }}>Trip Information</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Trip ID</p>
                  <Link href={`/Dashboard/Trip/Report/${transaction.trip.id}`} className="font-medium hover:underline" style={{ color: '#2563EB' }}>
                    {transaction.trip.id}
                  </Link>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Distance</p>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.trip.distance}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-2" style={{ color: '#5A6C7D' }}>Duration</p>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.trip.duration}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm mb-2 flex items-center gap-2" style={{ color: '#5A6C7D' }}>
                    <MapPin className="w-4 h-4" style={{ color: '#10B981' }} />
                    Pickup Location
                  </p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.trip.pickup}</p>
                </div>
                
                <div>
                  <p className="text-sm mb-2 flex items-center gap-2" style={{ color: '#5A6C7D' }}>
                    <MapPin className="w-4 h-4" style={{ color: '#EF4444' }} />
                    Dropoff Location
                  </p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.trip.dropoff}</p>
                </div>
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h2 className="text-xl font-bold mb-6" style={{ color: '#1A2332' }}>Audit Trail</h2>
            
            <div className="space-y-4">
              {transaction.auditTrail.map((audit: any, idx: number) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: '#2563EB' }}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium" style={{ color: '#1A2332' }}>{audit.action}</p>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        {new Date(audit.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm" style={{ color: '#5A6C7D' }}>by {audit.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Driver Information */}
          {transaction.driver && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                Driver Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Name</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.driver.name}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Phone</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.driver.phone}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Email</p>
                  <p className="font-medium text-sm break-all" style={{ color: '#1A2332' }}>{transaction.driver.email}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>License Number</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.driver.licenseNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Information */}
          {transaction.vehicle && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <Car className="w-5 h-5" style={{ color: '#2563EB' }} />
                Vehicle Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Model</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.vehicle.model}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Registration Number</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.vehicle.number}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Year</p>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.vehicle.year}</p>
                  </div>
                  <div>
                    <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Color</p>
                    <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.vehicle.color}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Information */}
          {transaction.customer && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                Customer Information
              </h3>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Name</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Phone</p>
                  <p className="font-medium" style={{ color: '#1A2332' }}>{transaction.customer.phone}</p>
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Email</p>
                  <p className="font-medium text-sm break-all" style={{ color: '#1A2332' }}>{transaction.customer.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Notes */}
          {transaction.notes && (
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <FileText className="w-5 h-5" style={{ color: '#2563EB' }} />
                Additional Notes
              </h3>
              
              <p className="text-sm" style={{ color: '#5A6C7D' }}>{transaction.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Actions</h3>
            
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium border hover:bg-red-50 transition-all" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
                <Trash2 className="w-5 h-5" />
                Delete Transaction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}