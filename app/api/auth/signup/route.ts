// app/api/auth/signup/route.ts
// API Route - app/page-path: POST /api/auth/signup

import { NextResponse } from 'next/server';

export async function POST() {
  // Sign-up is disabled: accounts are created by SuperAdmin only.
  return NextResponse.json(
    { error: 'Sign up is disabled. Please contact your administrator.' },
    { status: 403 }
  );
}