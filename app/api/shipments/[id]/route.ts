// app/api/shipments/[id]/route.ts
// API Route - app/page-path: GET /api/shipments/[id]

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

async function getUserIdFromAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');

    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error } = await supabaseAuth.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserIdFromAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Use a Supabase client authorized with the user's token to satisfy RLS
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const supabaseDb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get shipment
    const { data: shipment, error: shipmentError } = await supabaseDb
      .from('shipments')
      .select('*')
      .eq('id', id)
      .single();

    if (shipmentError || !shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Get tracking events
    const { data: events, error: eventsError } = await supabaseDb
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('event_time', { ascending: true });

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
