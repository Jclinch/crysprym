// app/api/admin/dashboard/route.ts
// Admin Dashboard API - GET /api/admin/dashboard

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());

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

    // Get dashboard statistics
    const [{ count: totalShipments }, { count: activeShipments }] = await Promise.all([
      supabase.from('shipments').select('*', { count: 'exact', head: true }),
      supabase
        .from('shipments')
        .select('*', { count: 'exact', head: true })
        .in('status', ['confirmed', 'in_transit']),
    ]);

    let totalUsers = 0;
    let adminUsers = 0;
    if (role === 'superadmin') {
      const [{ count: totalUsersCount }, { count: adminUsersCount }] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      ]);
      totalUsers = totalUsersCount || 0;
      adminUsers = adminUsersCount || 0;
    }

    // Get recent shipments
    const { data: recentShipments, error: shipmentsError } = await supabase
      .from('shipments')
      .select(`
        id,
        tracking_number,
        status,
        sender_name,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (shipmentsError) {
      console.error('Error fetching recent shipments:', shipmentsError);
    }

    return NextResponse.json({
      totalShipments: totalShipments || 0,
      activeShipments: activeShipments || 0,
      totalUsers: totalUsers || 0,
      adminUsers: adminUsers || 0,
      recentShipments: recentShipments || [],
      isSuperadmin: role === 'superadmin',
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}