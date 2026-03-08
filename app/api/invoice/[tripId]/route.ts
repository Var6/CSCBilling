import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Trip from '@/models/Trip';
import CompanyAdmin from '@/models/CompanyAdmin';
import { verifyToken } from '@/lib/jwt';

export async function GET(
  req: Request,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    await connectDB();

    const { tripId } = await context.params;

    // Find by _id (24-char hex) or tripNumber
    let trip: any = null;
    if (/^[0-9a-fA-F]{24}$/.test(tripId)) {
      trip = await Trip.findById(tripId).lean();
    }
    if (!trip) {
      trip = await Trip.findOne({ tripNumber: tripId }).lean();
    }

    if (!trip) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get company info from JWT
    let company: any = null;
    try {
      const cookieHeader = req.headers.get('cookie') || '';
      const tokenMatch = cookieHeader.match(/token=([^;]+)/);
      const token = tokenMatch?.[1];
      if (token) {
        const decoded = verifyToken(token) as any;
        if (decoded?.userId) {
          company = await CompanyAdmin.findById(decoded.userId).lean();
        }
      }
    } catch {}

    // Format data for the invoice component
    const invoiceData = {
      invoiceNo: trip.tripNumber || trip._id.toString(),
      date: trip.timing?.tripDate || trip.createdAt,
      customerName: trip.customer?.name || '',
      customerPhone: trip.customer?.phone || '',
      tripType: 'One Way' as const,
      pickup: trip.route?.pickup || '',
      dropoff: trip.route?.dropoff || '',
      distanceKm: trip.odometer?.totalKm || 0,
      ratePerKm: trip.charges?.costPerKm || 20,
      standbyMinutes: trip.charges?.waitingMinutes || 0,
      discount: trip.charges?.discount || 0,
      gstRate: 5,
      vehicle: trip.vehicle
        ? { model: trip.vehicle.model, number: trip.vehicle.plate }
        : undefined,
      driverName: trip.driver?.name || '',
      additionalServices: trip.charges?.additionalServices || [],
      paymentMethod: trip.payment?.method || 'cash',
      paymentStatus: trip.payment?.status || 'pending',
      company: company
        ? {
            name: company.companyName,
            gstin: company.gstNumber || '',
            address: company.address || '',
            city: company.city || '',
            state: company.state || '',
            phone: company.officialPhone || '',
            email: company.officialEmail || '',
          }
        : null,
    };

    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Invoice generation error:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}
