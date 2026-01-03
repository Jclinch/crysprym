// app/api/admin/users/route.ts
// SuperAdmin Users API - GET/POST /api/admin/users

import { createClient } from '@/utils/supabase/server';
import { createClient as createSbAdmin } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const { searchParams } = new URL(request.url);

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

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        location,
        created_at,
        last_sign_in_at
      `, { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { data: usersData, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Prepare service role client for auth.admin calls (to read last_sign_in_at)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }
    const supabaseAdmin = createSbAdmin(supabaseUrl, serviceRoleKey);

    // Get shipment counts for each user
    const userIds = usersData?.map(u => u.id) || [];
    const { data: shipmentCounts } = await supabase
      .from('shipments')
      .select('user_id')
      .in('user_id', userIds);

    const shipmentCountMap = (shipmentCounts || []).reduce((acc, shipment) => {
      acc[shipment.user_id] = (acc[shipment.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fetch last sign in from Supabase Auth for the returned users
    const authUsers = await Promise.all(
      (usersData || []).map(async (u) => {
        try {
          const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(u.id);
          return { id: u.id, lastSignInAt: authUser?.user?.last_sign_in_at || null } as const;
        } catch {
          return { id: u.id, lastSignInAt: null } as const;
        }
      })
    );
    const lastSignInMap = new Map(authUsers.map((u) => [u.id, u.lastSignInAt]));

    const users = (usersData || []).map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      location: user.location,
      createdAt: user.created_at,
      lastSignIn: lastSignInMap.get(user.id) ?? user.last_sign_in_at ?? null,
      shipmentCount: shipmentCountMap[user.id] || 0,
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      users,
      totalPages,
      currentPage: page,
      totalCount: count || 0,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());

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

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const role = typeof body.role === 'string' ? body.role.trim() : 'user';
    const location = typeof body.location === 'string' ? body.location.trim() : '';

    if (!email || !fullName || !password || !location) {
      return NextResponse.json(
        { error: 'email, fullName, password, and location are required' },
        { status: 400 }
      );
    }

    // Basic hardening: do not allow creating superadmin from the UI.
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'role must be user or admin' },
        { status: 400 }
      );
    }

    // Basic password policy
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Use service role for creating auth user + inserting profile
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createSbAdmin(supabaseUrl, serviceRoleKey);

    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: created.user.id,
        email,
        full_name: fullName,
        role,
        location,
      });

    if (profileError) {
      // If profile insert fails, leave auth user but return actionable error.
      return NextResponse.json(
        { error: 'User created in auth, but profile creation failed', details: profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('SuperAdmin create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}