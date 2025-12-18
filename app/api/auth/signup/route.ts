// app/api/auth/signup/route.ts
// API Route - app/page-path: POST /api/auth/signup

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { fullName, email, password, agreeToTerms } = await request.json();

    if (!fullName || !email || !password || !agreeToTerms) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use Supabase auth to sign up user with email and password
    // Supabase handles password hashing automatically
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      );
    }

    // Also store user info in users table for app-level data
    // Note: This will be handled by the database trigger, but we'll keep this for backward compatibility
    const { error: dbError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          full_name: fullName,
          role: authData.user.email === 'admin@cryspryms.com' ? 'admin' : 'user', // Make admin@cryspryms.com an admin by default
        },
      ]);

    if (dbError && !dbError.message.includes('duplicate key')) {
      // User was created in auth but failed in db, still successful for auth
      console.error('Database error:', dbError);
    }

    return NextResponse.json(
      { message: 'User created successfully', user: { email, fullName } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}