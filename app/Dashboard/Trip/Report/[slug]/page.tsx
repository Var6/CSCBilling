'use client';
import React, { useState } from 'react';
import { ArrowLeft, MapPin, User, Phone, Car, Calendar, Clock, DollarSign, FileText, Printer, Download, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Navigation } from 'lucide-react';
import { useParams } from "next/navigation";
import Link from 'next/link';

export default function TripDetailsPage() {
   const params = useParams();
const id = params?.slug; // <-- use the bracket name here

  // In a real app, you'd fetch this data based on the slug/ID from params



const [trip, setTrip] = useState<any>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

React.useEffect(() => {
  console.log("Trip ID:", id);
  if (!id) return;

  const fetchTrip = async () => {
    try {
      const res = await fetch(`/api/trip/report/${id}`, { cache: "no-store" });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData?.error || "Trip not found");
      }
      const data = await res.json();
      setTrip(data);
    } catch (err: any) {
      setError(err.message || "Failed to load trip");
    } finally {
      setLoading(false);
    }
  };

  fetchTrip();
}, [id]);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'completed':
        return {
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          icon: <CheckCircle className="w-5 h-5" />,
          label: 'Completed'
        };
      case 'ongoing':
        return {
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: <Navigation className="w-5 h-5" />,
          label: 'Ongoing'
        };
      case 'pending':
        return {
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          border: 'border-yellow-200',
          icon: <AlertCircle className="w-5 h-5" />,
          label: 'Pending'
        };
      case 'cancelled':
        return {
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          icon: <XCircle className="w-5 h-5" />,
          label: 'Cancelled'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: <AlertCircle className="w-5 h-5" />,
          label: 'Unknown'
        };
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Generate PDF or download logic
    alert('Downloading trip report...');
  };

  const handleEdit = () => {
    // Navigate to edit page
    alert('Navigate to edit page');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Delete logic
    alert('Trip deleted successfully');
    setShowDeleteConfirm(false);
  };

  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Loading trip details...</p>
    </div>
  );
}

if (error || !trip) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-red-600">{error || "Trip not found"}</p>
    </div>
  );
}
const statusConfig = getStatusConfig(trip.status);

  return (

    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 mb-4 px-4 py-2 rounded-lg hover:bg-white transition-colors"
            style={{ color: '#5A6C7D' }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Trips
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold" style={{ color: '#1A2332' }}>
                  {trip.tripId}
                </h1>
                <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
              <p style={{ color: '#5A6C7D' }}>
                Created on {new Date(trip.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>

            <div className="flex items-center gap-3">
              
<Link href={`/invoice/${trip.tripId}`} target="_blank">
  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:shadow-md"
    style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
    <FileText className="w-4 h-4" />
    Generate Invoice
  </button>
</Link>
              <button 
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white transition-colors"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button 
                onClick={handleEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-all hover:shadow-md"
                style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' }}
              >
                <Edit className="w-4 h-4" />
                Edit Trip
              </button>
              <button 
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                style={{ border: '1px solid #EF4444', color: '#EF4444' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Route Information */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <MapPin className="w-5 h-5" style={{ color: '#2563EB' }} />
                Route Information
              </h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                    <div className="w-0.5 flex-1 my-2" style={{ backgroundColor: '#E5E7EB', minHeight: '40px' }}></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <div className="text-sm font-medium mb-1" style={{ color: '#5A6C7D' }}>Pickup Location</div>
                      <div className="font-medium" style={{ color: '#1A2332' }}>{trip.route.pickup}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-1" style={{ color: '#5A6C7D' }}>Drop-off Location</div>
                      <div className="font-medium" style={{ color: '#1A2332' }}>{trip.route.dropoff}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Distance</div>
                    <div className="font-semibold" style={{ color: '#1A2332' }}>{trip.distance}</div>
                  </div>
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Duration</div>
                    <div className="font-semibold" style={{ color: '#1A2332' }}>{trip.duration}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer & Driver Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Info */}
              <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                  <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                  Customer Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Name</div>
                    <div className="font-medium" style={{ color: '#1A2332' }}>{trip.customer.name}</div>
                  </div>
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Phone</div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                      <a href={`tel:${trip.customer.phone}`} className="font-medium hover:underline" style={{ color: '#2563EB' }}>
                        {trip.customer.phone}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Info */}
              <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                  <User className="w-5 h-5" style={{ color: '#2563EB' }} />
                  Driver Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Name</div>
                    <div className="font-medium" style={{ color: '#1A2332' }}>{trip.driver.name}</div>
                  </div>
                  <div>
                    <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Driver ID</div>
                    <div className="font-mono text-sm" style={{ color: '#5A6C7D' }}>
                      {trip.driver.driverId}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {trip.notes && (
              <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: '#1A2332' }}>
                  <FileText className="w-5 h-5" style={{ color: '#2563EB' }} />
                  Trip Notes
                </h3>
                <p style={{ color: '#5A6C7D' }}>{trip.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            {/* Vehicle Info */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <Car className="w-5 h-5" style={{ color: '#2563EB' }} />
                Vehicle Details
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Model</div>
                  <div className="font-medium" style={{ color: '#1A2332' }}>{trip.vehicle.model}</div>
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>License Plate</div>
                  <div className="font-mono font-bold text-lg px-3 py-2 rounded-lg inline-block" style={{ backgroundColor: '#F8F9FA', color: '#1A2332' }}>
                    {trip.vehicle.number}
                  </div>
                </div>
                <div>
                  <div className="text-sm mb-1" style={{ color: '#5A6C7D' }}>Vehicle ID</div>
                  <div className="font-mono text-sm" style={{ color: '#5A6C7D' }}>
                    {trip.vehicle.vehicleId}
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Schedule */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Schedule</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" style={{ color: '#2563EB' }} />
                  <div>
                    <div className="text-sm" style={{ color: '#5A6C7D' }}>Date</div>
                    <div className="font-medium" style={{ color: '#1A2332' }}>
                      {new Date(trip.tripDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5" style={{ color: '#2563EB' }} />
                  <div>
                    <div className="text-sm" style={{ color: '#5A6C7D' }}>Time</div>
                    <div className="font-medium" style={{ color: '#1A2332' }}>{trip.tripTime}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-xl shadow-sm p-6" style={{ border: '2px solid #2563EB', background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)' }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#1A2332' }}>
                <DollarSign className="w-5 h-5" style={{ color: '#2563EB' }} />
                Payment Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: '#5A6C7D' }}>Trip Fare</span>
                  <span className="font-semibold" style={{ color: '#1A2332' }}>${trip.fare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#5A6C7D' }}>Payment Method</span>
                  <span className="font-medium" style={{ color: '#1A2332' }}>{trip.paymentMethod}</span>
                </div>
                <div className="pt-3 border-t flex justify-between items-center" style={{ borderColor: '#2563EB' }}>
                  <span className="font-bold text-lg" style={{ color: '#1A2332' }}>Total Amount</span>
                  <span className="font-bold text-2xl" style={{ color: '#2563EB' }}>${trip.fare.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
              <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Trip Metadata</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: '#5A6C7D' }}>Trip ID</span>
                  <span className="font-mono" style={{ color: '#1A2332' }}>{trip.tripId}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#5A6C7D' }}>Database ID</span>
                  <span className="font-mono text-xs" style={{ color: '#9CA3AF' }}>{trip._id}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#5A6C7D' }}>Last Updated</span>
                  <span style={{ color: '#1A2332' }}>
                    {new Date(trip.updatedAt).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <Trash2 className="w-6 h-6" style={{ color: '#EF4444' }} />
              </div>
              <h3 className="text-xl font-bold" style={{ color: '#1A2332' }}>Delete Trip</h3>
            </div>
            <p className="mb-6" style={{ color: '#5A6C7D' }}>
              Are you sure you want to delete trip <span className="font-semibold">{trip.tripId}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all"
                style={{ backgroundColor: '#EF4444' }}
              >
                Delete Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}