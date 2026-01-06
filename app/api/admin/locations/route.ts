// app/api/admin/locations/route.ts
// SuperAdmin Locations Management API - GET/POST /api/admin/locations

import { createClient } from '@/utils/supabase/server';
import { createClient as createSbAdmin } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

function getServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) return null;
  return createSbAdmin(supabaseUrl, serviceRoleKey);
}

async function requireSuperadmin() {
  const supabase = createClient(cookies());
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false as const, status: 401 as const, supabase: null };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || userData?.role !== 'superadmin') {
    return { ok: false as const, status: 403 as const, supabase: null };
  }

  return { ok: true as const, status: 200 as const, supabase };
}

export async function GET() {
  try {
    const auth = await requireSuperadmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Unauthorized' : 'SuperAdmin access required' },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('locations')
      .select('id,name,is_active,created_at,updated_at')
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
    }

    return NextResponse.json({ locations: data || [] });
  } catch (e) {
    console.error('Admin locations GET error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperadmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Unauthorized' : 'SuperAdmin access required' },
        { status: auth.status }
      );
    }

    const supabaseAdmin = getServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // Upsert + reactivate if it already exists.
    const { data, error } = await supabaseAdmin
      .from('locations')
      .upsert({ name, is_active: true }, { onConflict: 'name' })
      .select('id,name,is_active')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create location', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data }, { status: 201 });
  } catch (e) {
    console.error('Admin locations POST error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
