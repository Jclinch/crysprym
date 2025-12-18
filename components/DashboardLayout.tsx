// // src/components/DashboardLayout.tsx
// // Main layout for dashboard pages - app/page-path: /dashboard/*

// 'use client';

// import React from 'react';
// import { Header } from './Header';
// import { Sidebar } from './Sidebar';
// import { useRouter } from 'next/navigation';

// interface DashboardLayoutProps {
//   children: React.ReactNode;
// }

// export function DashboardLayout({ children }: DashboardLayoutProps) {
//   const router = useRouter();

//   const handleLogout = async () => {
//     try {
//       const response = await fetch('/api/auth/logout', { method: 'POST' });
//       if (response.ok) {
//         router.push('/signin');
//       }
//     } catch (error) {
//       console.error('Logout error:', error);
//     }
//   };

//   return (
//     <div className="flex h-screen bg-[#F8FAFC]">
//       <Sidebar />
//       <div className="flex-1 flex flex-col">
//         <Header onLogout={handleLogout} />
//         <main className="flex-1 overflow-auto p-8">
//           {children}
//         </main>
//       </div>
//     </div>
//   );
// }



// src/components/DashboardLayout.tsx
// Main layout for dashboard pages - app/page-path: /dashboard/*

'use client';

import React from 'react';
import { Header } from './Header';

import { Tabs } from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        router.push('/signin');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className=" h-screen bg-[#F8FAFC]">
              <Header onLogout={handleLogout} />

      <div className="flex-1 flex flex-col">
              {/* <Tabs /> */}

        <main className="flex-1 overflow-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
