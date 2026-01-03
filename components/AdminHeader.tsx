import React from 'react'

export default function AdminHeader({
  title = 'Admin Panel',
  subtitle = 'Welcome',
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div>
      <header className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1E293B]">{title}</h1>
          <div className="text-sm text-[#94A3B8]">{subtitle}</div>
        </div>
      </header>
    </div>
  )
}