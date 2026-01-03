// app/api/admin/shipments/route.ts
// Admin Shipments API - GET /api/admin/shipments

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const { searchParams } = new URL(request.url);

    // Check if user is staff (admin/superadmin)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = userData?.role;
    if (userError || !role || !['admin', 'superadmin'].includes(role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('shipments')
      .select(`
        id,
        tracking_number,
        status,
        progress_step,
        sender_name,
        receiver_name,
        receiver_contact,
        origin_location,
        destination,
        items_description,
        weight,
        shipment_date,
        created_at,
        user_id
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      // Search across tracking_number, destination, and items_description
      query = query.or(
        `tracking_number.ilike.%${search}%,destination.ilike.%${search}%,items_description.ilike.%${search}%`
      );
    }

    if (status) {
      // UI filters by progress_step (pending/in_transit/out_for_delivery/delivered).
      // DB `status` is shipment_status (created/confirmed/in_transit/delivered/...).
      if (['pending', 'in_transit', 'out_for_delivery', 'delivered'].includes(status)) {
        query = query.eq('progress_step', status);
      } else {
        query = query.eq('status', status);
      }
    }

    const { data: shipments, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching shipments:', error);
      return NextResponse.json({ error: 'Failed to fetch shipments' }, { status: 500 });
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      shipments: shipments || [],
      totalPages,
      currentPage: page,
      totalCount: count || 0,
    });
  } catch (error) {
    console.error('Admin shipments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}