// app/api/shipments/[id]/route.ts
// API Route - app/page-path: GET /api/shipments/[id]

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

function getUserIdFromAuth(request: NextRequest): string | null {
  const cookieStore = request.cookies;
  const authToken = cookieStore.get('auth_token')?.value;

  if (!authToken) return null;

  try {
    const decoded = JSON.parse(Buffer.from(authToken, 'base64').toString());
    return decoded.userId;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = getUserIdFromAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get shipment
    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Get tracking events
    const { data: events, error: eventsError } = await supabase
      .from('tracking_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('event_timestamp', { ascending: true });

    if (eventsError) {
      return NextResponse.json(
        { error: 'Failed to fetch tracking events' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...shipment,
      events: events || [],
    });
  } catch (error) {
    console.error('Shipment detail error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
