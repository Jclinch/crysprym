// app/api/auth/signin/route.ts
// API Route - app/page-path: POST /api/auth/signin

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Missing email or password' },
        { status: 400 }
      );
    }

    // Create response to set cookies on
    const response = new NextResponse();

    // Create Supabase server client with proper cookie handling
    const supabase = createServerClient(
      supabaseUrl!,
      supabaseKey!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Sign in with email and password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get user info from users table
    const { data: user } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', authData.user.id)
      .single();

    const roleToRedirect = (role?: string | null) => {
      if (role === 'superadmin') return '/superadmin/dashboard';
      if (role === 'admin') return '/admin/dashboard';
      return '/dashboard';
    };

    // If user profile row doesn't exist yet, rely on DB trigger to create it.
    // Redirect based on email as a temporary fallback; middleware will enforce role-based access.
    if (!user) {
      const emailLower = (authData.user.email || '').toLowerCase();
      const redirectUrl =
        emailLower === 'officialsunnyugwu@gmail.com'
          ? '/superadmin/dashboard'
          : emailLower === 'admin@cryspryms.com'
            ? '/admin/dashboard'
            : '/dashboard';
      const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url));
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    // User exists - check if they should be admin and update if necessary
    // Role correction is handled by DB migrations/triggers; avoid client updates that can hit RLS.

    // Redirect based on role (server-side)
    const redirectUrl = roleToRedirect(user.role);
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url));

    // Preserve cookies set during auth
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });

    return redirectResponse;
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
