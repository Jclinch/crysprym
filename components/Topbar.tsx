'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { LayoutDashboard, Users, BarChart3, Settings as SettingsIcon } from 'lucide-react';

type NavItem = { href: string; label: string; icon: React.ReactNode };

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
];

const Topbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string>('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/signin');
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (mounted) setUserEmail(user?.email ?? '');
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [supabase]);

  const isActive = (href: string) => {
    // Consider hash routes active when on dashboard
    if (href.includes('#') && pathname === '/admin/dashboard') return true;
    return pathname === href;
  };

  return (
    <header className="bg-white border-b border-[#E2E8F0]"> 
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#94A3B8]">{userEmail || 'cryspryms Pro'}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* <Link
            href="/dashboard"
            className="px-4 py-2 bg-black hover:bg-[#111827] text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            Back to Dashboard
          </Link> */}
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-black hover:bg-[#111827] text-white rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Top tab switch navigation */}
      <nav className="px-6 pb-4">
        <div className="flex items-center gap-2">
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors cursor-pointer
                ${isActive(item.href) ? 'bg-[#0F2940] text-white' : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E293B]'}
              `}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Topbar;