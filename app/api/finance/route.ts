import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Finance from '@/models/Finance';
import Trip from '@/models/Trip';
import { verifyToken } from '@/lib/jwt';

async function getCompanyId(req: Request): Promise<string | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    const token = tokenMatch?.[1];
    if (token) {
      const decoded = verifyToken(token) as any;
      return decoded?.userId || null;
    }
  } catch {}
  return null;
}

/* =========================
   GET — List Finance Entries + Summary
========================= */
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const month = searchParams.get('month'); // YYYY-MM
    const type = searchParams.get('type');

    let filter: any = {};

    if (dateStr) {
      const start = new Date(dateStr);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateStr);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    } else if (month) {
      const [y, m] = month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0, 23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    if (type) filter.type = type;

    const entries = await Finance.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    // Summary
    const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      entries,
      summary: {
        totalIncome,
        totalExpense,
        net: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error('GET /api/finance error:', error);
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 });
  }
}

/* =========================
   POST — Create Finance Entry
========================= */
export async function POST(req: Request) {
  try {
    await connectDB();

    const companyId = await getCompanyId(req);
    if (!companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    if (!body.type || !body.category || !body.description || !body.amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const entry = await Finance.create({
      companyId,
      date: body.date ? new Date(body.date) : new Date(),
      type: body.type,
      category: body.category,
      description: body.description,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod || 'cash',
      referenceId: body.referenceId || '',
      notes: body.notes || '',
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('POST /api/finance error:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}

/* =========================
   PUT — Update Finance Entry
========================= */
export async function PUT(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body._id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const updated = await Finance.findByIdAndUpdate(
      body._id,
      {
        date: body.date ? new Date(body.date) : undefined,
        type: body.type,
        category: body.category,
        description: body.description,
        amount: body.amount ? Number(body.amount) : undefined,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
      },
      { new: true, omitUndefined: true }
    );

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/finance error:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

/* =========================
   DELETE — Delete Finance Entry
========================= */
export async function DELETE(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await Finance.findByIdAndDelete(body.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/finance error:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
