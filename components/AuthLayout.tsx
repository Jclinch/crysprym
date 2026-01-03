// src/components/AuthLayout.tsx
// Layout for authentication pages - app/page-path: /signin

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl font-bold text-[#2563EB] mb-2">📦</div>
          <h1 className="text-2xl font-bold text-[#1E293B]">{title}</h1>
          <p className="text-sm text-[#475569] mt-1">{subtitle}</p>
        </div>
        
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
          {children}
        </div>
      </div>
    </div>
  );
}
