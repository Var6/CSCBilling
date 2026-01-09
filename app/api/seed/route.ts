// app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { createTestUser } from '@/app/lib/seedUser';

export async function GET() {
  await createTestUser();
  return NextResponse.json({ success: true });
}
