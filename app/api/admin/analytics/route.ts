// app/api/admin/analytics/route.ts
// Admin Analytics API - GET /api/admin/analytics

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

    // Get shipment trends for last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: shipmentTrends, error: trendsError } = await supabase
      .from('shipments')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at');

    // Process trends data
    const trendsMap = (shipmentTrends || []).reduce((acc, shipment) => {
      const date = new Date(shipment.created_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const shipmentTrendsData = Object.entries(trendsMap).map(([date, count]) => ({
      date,
      count,
    }));

    // Get status distribution
    const { data: statusData, error: statusError } = await supabase
      .from('shipments')
      .select('status');

    const statusDistribution = (statusData || []).reduce((acc, shipment) => {
      acc[shipment.status] = (acc[shipment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistributionData = Object.entries(statusDistribution).map(([status, count]) => ({
      status,
      count,
    }));

    // Get top routes
    const { data: routesData, error: routesError } = await supabase
      .from('shipments')
      .select('origin_location, destination');

    const routesMap = (routesData || []).reduce((acc, shipment) => {
      const route = `${shipment.origin_location} → ${shipment.destination}`;
      acc[route] = (acc[route] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topRoutesData = Object.entries(routesMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([route, count]) => ({ route, count }));

    return NextResponse.json({
      shipmentTrends: shipmentTrendsData,
      statusDistribution: statusDistributionData,
      topRoutes: topRoutesData,
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}