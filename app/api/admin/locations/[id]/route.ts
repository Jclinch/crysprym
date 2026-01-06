// app/api/admin/locations/[id]/route.ts
// SuperAdmin Locations Management API - PATCH/DELETE /api/admin/locations/:id

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
  if (authError || !user) return { ok: false as const, status: 401 as const };

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || userData?.role !== 'superadmin') {
    return { ok: false as const, status: 403 as const };
  }

  return { ok: true as const, status: 200 as const };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperadmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Unauthorized' : 'SuperAdmin access required' },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const supabaseAdmin = getServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
      update.name = name;
    }

    if (typeof body.is_active === 'boolean') {
      update.is_active = body.is_active;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('locations')
      .update(update)
      .eq('id', id)
      .select('id,name,is_active')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update location', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ location: data });
  } catch (e) {
    console.error('Admin locations PATCH error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// "Remove" a location by deactivating it (safer than hard delete)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSuperadmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.status === 401 ? 'Unauthorized' : 'SuperAdmin access required' },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const supabaseAdmin = getServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const { error } = await supabaseAdmin
      .from('locations')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to remove location', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Location removed' });
  } catch (e) {
    console.error('Admin locations DELETE error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
