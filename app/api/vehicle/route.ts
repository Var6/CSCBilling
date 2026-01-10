// app/api/vehicles/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: '1',
      name: 'Swift Dzire',
      number: 'BR01AB1234',
    },
    {
      id: '2',
      name: 'Innova Crysta',
      number: 'BR01CD5678',
    },
  ]);
}
