// app/api/shipments/route.ts
// API Route - app/page-path: GET/POST /api/shipments

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Server-side Supabase client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

async function getUserIdFromAuth(request: NextRequest): Promise<string | null> {
  try {
    // Get the session from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header');
      return null;
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create a Supabase client with the user's token
    const supabase = createClient(
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

    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      console.error('Auth error:', error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

// Get shipments
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    let query = supabaseDb
      .from('shipments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(
        `tracking_number.ilike.%${search}%,origin_location.ilike.%${search}%,destination.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch shipments' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Fetch shipments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create shipment
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // shipmentDate should be an ISO date string (YYYY-MM-DD)
    const shipmentDate = typeof body.shipmentDate === 'string' ? body.shipmentDate.trim() : '';
    if (!shipmentDate) {
      return NextResponse.json(
        { error: 'shipmentDate is required' },
        { status: 400 }
      );
    }

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

    // Set tracking number to 'not-assigned' if not provided (admin will set it later)
    const trackingNumber = body.waybillNumber && body.waybillNumber.trim() ? body.waybillNumber : 'not-assigned';

    const { data, error } = await supabaseDb
      .from('shipments')
      .insert([
        {
          user_id: userId,
          tracking_number: trackingNumber,
          sender_name: body.senderName,
          receiver_name: body.receiverName,
          items_description: body.itemsDescription,
          weight: body.weight,
          origin_location: body.originLocation,
          destination: body.destination,
          shipment_date: shipmentDate,
          package_image_bucket: body.packageImageBucket,
          package_image_path: body.packageImagePath,
          package_image_url: body.packageImageUrl,
          status: 'created',
          progress_step: 'pending',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: `Failed to create shipment: ${error.message}` },
        { status: 500 }
      );
    }

    // Create initial shipment event
    await supabaseDb.from('shipment_events').insert([
      {
        shipment_id: data.id,
        event_type: 'shipment_created',
        description: 'Shipment created and pending pickup',
        created_by: userId,
      },
    ]);

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create shipment error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
