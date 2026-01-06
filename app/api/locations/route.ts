// app/api/locations/route.ts
// Public (authenticated) Locations API - GET /api/locations

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(cookies());

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('locations')
      .select('id,name,is_active')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [] });
  } catch (e) {
    console.error('Locations API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
