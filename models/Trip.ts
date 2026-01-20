// models/Trip.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ITrip extends Document {
  // Basic Trip Information
  tripId: string; // Unique trip identifier (e.g., TRP-2401)
  bookingType: 'instant' | 'scheduled' | 'corporate';
  status: 'pending' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled' | 'no_show';
  
  // Customer Information
  customer: {
    customerId: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    email?: string;
    idProof?: {
      type: string;
      number: string;
    };
  };
  
  // Driver Information
  driver: {
    driverId: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: Date;
    assignedAt: Date;
  };
  
  // Vehicle Information
  vehicle: {
    vehicleId: mongoose.Types.ObjectId;
    registrationNumber: string;
    make: string;
    model: string;
    color: string;
    year: number;
    insuranceNumber: string;
    insuranceExpiry: Date;
    permitNumber: string;
    permitExpiry: Date;
    pucNumber?: string;
    pucExpiry?: Date;
  };
  
  // Location & Route Details
  route: {
    pickup: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      landmark?: string;
      timestamp: Date;
    };
    dropoff: {
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      landmark?: string;
      timestamp?: Date;
    };
    waypoints?: Array<{
      address: string;
      coordinates: {
        latitude: number;
        longitude: number;
      };
      timestamp: Date;
    }>;
    actualRoute?: Array<{
      latitude: number;
      longitude: number;
      timestamp: Date;
      speed?: number; // km/h
    }>;
  };
  
  // Time Tracking (Critical for Police Records)
  timeline: {
    bookingTime: Date;
    scheduledPickupTime?: Date;
    driverAssignedTime?: Date;
    driverArrivedTime?: Date;
    tripStartTime?: Date;
    tripEndTime?: Date;
    completionTime?: Date;
    cancellationTime?: Date;
  };
  
  // Distance & Odometer (Critical for Fare & Verification)
  distance: {
    estimatedKm: number;
    actualKm: number;
    startOdometer: number;
    endOdometer: number;
  };
  
  // Fare Breakdown
  fare: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    waitingCharges: number;
    nightCharges?: number;
    tollCharges?: number;
    parkingCharges?: number;
    additionalCharges?: Array<{
      name: string;
      amount: number;
      description?: string;
    }>;
    subtotal: number;
    tax: number;
    discount?: number;
    totalFare: number;
    currency: string;
  };
  
  // Payment Information
  payment: {
    method: 'cash' | 'card' | 'upi' | 'wallet' | 'corporate';
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transactionId?: string;
    paidAmount?: number;
    paymentTime?: Date;
    receiptNumber?: string;
  };
  
  // Safety & Security (Police-Level Details)
  security: {
    customerVerified: boolean;
    driverVerified: boolean;
    sosAlerts?: Array<{
      timestamp: Date;
      location: {
        latitude: number;
        longitude: number;
      };
      triggeredBy: 'customer' | 'driver' | 'system';
      status: 'active' | 'resolved' | 'false_alarm';
      policeNotified: boolean;
      incidentNumber?: string;
    }>;
    suspiciousActivity?: Array<{
      timestamp: Date;
      type: string;
      description: string;
      reportedBy: string;
    }>;
  };
  
  // Live Tracking Data
  tracking: {
    shareLink?: string;
    sharedWith?: Array<{
      name: string;
      phone: string;
      email?: string;
    }>;
    lastKnownLocation?: {
      latitude: number;
      longitude: number;
      timestamp: Date;
    };
  };
  
  // Ratings & Reviews
  feedback: {
    customerRating?: number;
    customerReview?: string;
    customerReviewTime?: Date;
    driverRating?: number;
    driverReview?: string;
    driverReviewTime?: Date;
  };
  
  // Incidents & Complaints
  incidents?: Array<{
    type: 'accident' | 'dispute' | 'complaint' | 'damage' | 'theft' | 'other';
    reportedBy: 'customer' | 'driver' | 'third_party';
    description: string;
    timestamp: Date;
    policeComplaint?: {
      filed: boolean;
      firNumber?: string;
      policeStation?: string;
      officerName?: string;
      officerContact?: string;
    };
    witnesses?: Array<{
      name: string;
      phone: string;
      statement?: string;
    }>;
    evidence?: Array<{
      type: 'image' | 'video' | 'document';
      url: string;
      timestamp: Date;
    }>;
    resolution?: {
      status: 'pending' | 'resolved' | 'escalated';
      resolvedBy?: string;
      resolvedAt?: Date;
      resolution?: string;
      compensation?: number;
    };
  }>;
  
  // Additional Services
  additionalServices?: Array<{
    serviceId: string;
    name: string;
    price: number;
    timestamp: Date;
  }>;
  
  // Cancellation Details
  cancellation?: {
    cancelledBy: 'customer' | 'driver' | 'system' | 'admin';
    reason: string;
    timestamp: Date;
    cancellationFee?: number;
  };
  
  // Weather & Traffic Conditions (Useful for Incidents)
  conditions?: {
    weather?: string;
    trafficLevel?: 'light' | 'moderate' | 'heavy';
    visibility?: string;
    roadCondition?: string;
  };
  
  // System Metadata
  metadata: {
    source: 'app' | 'web' | 'phone' | 'corporate';
    ipAddress?: string;
    deviceInfo?: string;
    appVersion?: string;
    createdBy?: string;
    updatedBy?: string;
    notes?: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>({
  tripId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  bookingType: { 
    type: String, 
    enum: ['instant', 'scheduled', 'corporate'],
    default: 'instant'
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
    index: true
  },
  
  customer: {
    customerId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Customer', 
      required: true,
      index: true
    },
    name: { type: String, required: true },
    phone: { type: String, required: true, index: true },
    email: String,
    idProof: {
      type: String,
      number: String
    }
  },
  
  driver: {
    driverId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Driver', 
      required: true,
      index: true
    },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    licenseExpiry: Date,
    assignedAt: Date
  },
  
  vehicle: {
    vehicleId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Vehicle', 
      required: true,
      index: true
    },
    registrationNumber: { type: String, required: true, index: true },
    make: String,
    model: String,
    color: String,
    year: Number,
    insuranceNumber: String,
    insuranceExpiry: Date,
    permitNumber: String,
    permitExpiry: Date,
    pucNumber: String,
    pucExpiry: Date
  },
  
  route: {
    pickup: {
      address: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      landmark: String,
      timestamp: { type: Date, required: true }
    },
    dropoff: {
      address: { type: String, required: true },
      coordinates: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true }
      },
      landmark: String,
      timestamp: Date
    },
    waypoints: [{
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      timestamp: Date
    }],
    actualRoute: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      speed: Number
    }]
  },
  
  timeline: {
    bookingTime: { type: Date, required: true, index: true },
    scheduledPickupTime: Date,
    driverAssignedTime: Date,
    driverArrivedTime: Date,
    tripStartTime: Date,
    tripEndTime: Date,
    completionTime: Date,
    cancellationTime: Date
  },
  
  distance: {
    estimatedKm: { type: Number, default: 0 },
    actualKm: { type: Number, default: 0 },
    startOdometer: { type: Number, required: true },
    endOdometer: Number
  },
  
  fare: {
    baseFare: { type: Number, default: 0 },
    distanceFare: { type: Number, default: 0 },
    timeFare: { type: Number, default: 0 },
    waitingCharges: { type: Number, default: 0 },
    nightCharges: Number,
    tollCharges: Number,
    parkingCharges: Number,
    additionalCharges: [{
      name: String,
      amount: Number,
      description: String
    }],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: Number,
    totalFare: { type: Number, required: true },
    currency: { type: String, default: 'INR' }
  },
  
  payment: {
    method: { 
      type: String, 
      enum: ['cash', 'card', 'upi', 'wallet', 'corporate'],
      required: true 
    },
    status: { 
      type: String, 
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAmount: Number,
    paymentTime: Date,
    receiptNumber: String
  },
  
  security: {
    customerVerified: { type: Boolean, default: false },
    driverVerified: { type: Boolean, default: false },
    sosAlerts: [{
      timestamp: Date,
      location: {
        latitude: Number,
        longitude: Number
      },
      triggeredBy: { type: String, enum: ['customer', 'driver', 'system'] },
      status: { type: String, enum: ['active', 'resolved', 'false_alarm'] },
      policeNotified: { type: Boolean, default: false },
      incidentNumber: String
    }],
    suspiciousActivity: [{
      timestamp: Date,
      type: String,
      description: String,
      reportedBy: String
    }]
  },
  
  tracking: {
    shareLink: String,
    sharedWith: [{
      name: String,
      phone: String,
      email: String
    }],
    lastKnownLocation: {
      latitude: Number,
      longitude: Number,
      timestamp: Date
    }
  },
  
  feedback: {
    customerRating: { type: Number, min: 1, max: 5 },
    customerReview: String,
    customerReviewTime: Date,
    driverRating: { type: Number, min: 1, max: 5 },
    driverReview: String,
    driverReviewTime: Date
  },
  
  incidents: [{
    type: { 
      type: String, 
      enum: ['accident', 'dispute', 'complaint', 'damage', 'theft', 'other'],
      required: true 
    },
    reportedBy: { 
      type: String, 
      enum: ['customer', 'driver', 'third_party'],
      required: true 
    },
    description: { type: String, required: true },
    timestamp: { type: Date, required: true },
    policeComplaint: {
      filed: { type: Boolean, default: false },
      firNumber: String,
      policeStation: String,
      officerName: String,
      officerContact: String
    },
    witnesses: [{
      name: String,
      phone: String,
      statement: String
    }],
    evidence: [{
      type: { type: String, enum: ['image', 'video', 'document'] },
      url: String,
      timestamp: Date
    }],
    resolution: {
      status: { type: String, enum: ['pending', 'resolved', 'escalated'], default: 'pending' },
      resolvedBy: String,
      resolvedAt: Date,
      resolution: String,
      compensation: Number
    }
  }],
  
  additionalServices: [{
    serviceId: String,
    name: String,
    price: Number,
    timestamp: Date
  }],
  
  cancellation: {
    cancelledBy: { type: String, enum: ['customer', 'driver', 'system', 'admin'] },
    reason: String,
    timestamp: Date,
    cancellationFee: Number
  },
  
  conditions: {
    weather: String,
    trafficLevel: { type: String, enum: ['light', 'moderate', 'heavy'] },
    visibility: String,
    roadCondition: String
  },
  
  metadata: {
    source: { 
      type: String, 
      enum: ['app', 'web', 'phone', 'corporate'],
      default: 'app'
    },
    ipAddress: String,
    deviceInfo: String,
    appVersion: String,
    createdBy: String,
    updatedBy: String,
    notes: String
  }
}, {
  timestamps: true
});

// Indexes for better query performance
TripSchema.index({ 'timeline.bookingTime': -1 });
TripSchema.index({ 'customer.customerId': 1, 'timeline.bookingTime': -1 });
TripSchema.index({ 'driver.driverId': 1, 'timeline.bookingTime': -1 });
TripSchema.index({ 'vehicle.vehicleId': 1, 'timeline.bookingTime': -1 });
TripSchema.index({ status: 1, 'timeline.bookingTime': -1 });
TripSchema.index({ 'vehicle.registrationNumber': 1 });
TripSchema.index({ 'customer.phone': 1 });
TripSchema.index({ 'driver.phone': 1 });
TripSchema.index({ 'payment.status': 1 });

// Auto-generate tripId before saving
TripSchema.pre<ITrip>('save', async function(next) {
  if (!this.tripId) {
    const count = await mongoose.models.Trip.countDocuments();
    this.tripId = `TRP-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for trip duration
TripSchema.virtual('duration').get(function() {
  if (this.timeline.tripStartTime && this.timeline.tripEndTime) {
    return Math.round((this.timeline.tripEndTime.getTime() - this.timeline.tripStartTime.getTime()) / 60000); // minutes
  }
  return null;
});

// Method to check if trip has any incidents
TripSchema.methods.hasIncidents = function() {
  return this.incidents && this.incidents.length > 0;
};

// Method to check if trip requires police attention
TripSchema.methods.requiresPoliceAttention = function() {
  if (!this.incidents) return false;
  return this.incidents.some((incident: any) => 
    incident.policeComplaint?.filed === true || 
    incident.type === 'accident' ||
    incident.resolution?.status === 'escalated'
  );
};

// Static method to get trips for a date range
TripSchema.statics.getTripsInDateRange = function(startDate: Date, endDate: Date) {
  return this.find({
    'timeline.bookingTime': {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ 'timeline.bookingTime': -1 });
};

// Static method to get active trips
TripSchema.statics.getActiveTrips = function() {
  return this.find({
    status: { $in: ['ongoing', 'confirmed'] }
  }).sort({ 'timeline.bookingTime': -1 });
};

export const Trip = mongoose.models.Trip || mongoose.model<ITrip>('Trip', TripSchema);