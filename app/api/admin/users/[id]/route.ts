// app/api/admin/users/[id]/route.ts
// SuperAdmin User Update API - PATCH /api/admin/users/[id]

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(cookies());
    const { id } = await params;

    // Check if user is superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const { role, location } = await request.json();

    const update: Record<string, unknown> = {};

    if (typeof role === 'string') {
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Valid role is required' }, { status: 400 });
      }
      update.role = role;
    }

    if (typeof location === 'string') {
      const trimmed = location.trim();
      if (!trimmed) {
        return NextResponse.json({ error: 'Valid location is required' }, { status: 400 });
      }
      update.location = trimmed;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    // Update user role
    const { error: updateError } = await supabase
      .from('users')
      .update(update)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating user role:', updateError);
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}