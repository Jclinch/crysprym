// app/admin/layout.tsx
// Admin Layout - app/page-path: /admin/*

"use client";

import React from "react";

import Topbar from "@/components/Topbar";
import AdminHeader from "@/components/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Admin Sidebar using reusable component */}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Admin Header */}
        <AdminHeader />
        <Topbar />

        <main className="flex-1 overflow-auto p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
