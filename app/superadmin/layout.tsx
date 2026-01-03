// app/superadmin/layout.tsx
// SuperAdmin Layout - app/page-path: /superadmin/*

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/Topbar';
import AdminHeader from '@/components/AdminHeader';
import { createClient } from '@/utils/supabase/client';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (!mounted) return;
          setIsAllowed(false);
          router.replace('/signin');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (profileError || profile?.role !== 'superadmin') {
          setIsAllowed(false);
          router.replace('/dashboard');
          return;
        }

        setIsAllowed(true);
      } finally {
        if (mounted) setIsChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-slate-500">Checking access…</p>
      </div>
    );
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <div className="flex-1 flex flex-col">
        <AdminHeader title="SuperAdmin Panel" subtitle="Welcome, SuperAdmin" />
        <Topbar basePath="/superadmin" />
        <main className="flex-1 overflow-auto p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
