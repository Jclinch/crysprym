// // components\Sidebar.tsx
// 'use client';

// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import { createClient } from '@/utils/supabase/client';
// import {
//   Plus,
//   Clock,
//   Search,
//   LogOut,
//   Shield,
// } from 'lucide-react';
// import Image from 'next/image';
// import { useEffect, useState } from 'react';

// const navItems = [
//   {
//     href: '/dashboard/new-shipment',
//     label: 'New Shipment',
//     icon: Plus,
//   },
//   {
//     href: '/dashboard/history',
//     label: 'Logistic History',
//     icon: Clock,
//   },
//   {
//     href: '/dashboard/tracking',
//     label: 'Live Tracking',
//     icon: Search,
//   },
// ];

// export function Sidebar() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const supabase = createClient();
//   const [userRole, setUserRole] = useState<string | null>(null);

//   useEffect(() => {
//     const getUserRole = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         const { data: userData } = await supabase
//           .from('users')
//           .select('role')
//           .eq('id', user.id)
//           .single();
//         setUserRole(userData?.role || 'user');
//       }
//     };

//     getUserRole();
//   }, [supabase]);

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push('/signin');
//   };

//   return (
//     <aside className="w-[240px] bg-white border-r border-[#ECECEC] flex flex-col ">
//       {/* Logo */}
//       <div className="mt-[6px] flex justify-center">
//         <Image
//           src="/logo.png"
//           alt="Bold Reach"
//           width={90}
//           height={90}
//           className=" object-contain"
//         />
//       </div>

//       <div className="mx-6 border-b border-[#ECECEC]" />

//       {/* Navigation */}
//       <nav className="flex-1 px-6 pt-8 space-y-4">
//         {navItems.map(({ href, label, icon: Icon }) => {
//           const isActive = pathname === href;

//           return (
//             <Link
//               key={href}
//               href={href}
//               className={`
//                 flex items-center gap-3 px-4 py-3 text-sm font-medium transition
//                 ${
//                   isActive
//                     ? 'bg-[#F97316] text-white rounded-xl'
//                     : 'text-[#8B8F97] hover:bg-[#F8F8F8] rounded-xl'
//                 }
//               `}
//             >
//               <Icon
//                 size={18}
//                 className={isActive ? 'text-white' : 'text-[#8B8F97]'}
//               />
//               {label}
//             </Link>
//           );
//         })}

//         {/* Admin Panel Link - Only show for admin users */}
//         {userRole === 'admin' && (
//           <Link
//             href="/admin/dashboard"
//             className={`
//               flex items-center gap-3 px-4 py-3 text-sm font-medium transition rounded-xl
//               ${
//                 pathname.startsWith('/admin')
//                   ? 'bg-[#F97316] text-white'
//                   : 'text-[#8B8F97] hover:bg-[#F8F8F8]'
//               }
//             `}
//           >
//             <Shield
//               size={18}
//               className={pathname.startsWith('/admin') ? 'text-white' : 'text-[#8B8F97]'}
//             />
//             Admin Panel
//           </Link>
//         )}
//       </nav>

//       {/* Sign Out */}
//       <div className="px-6 pb-6">
//         <button
//           onClick={handleLogout}
//           className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-600 transition"
//         >
//           <LogOut size={18} />
//           Sign Out
//         </button>
//       </div>
//     </aside>
//   );
// }







// 'use client';

// import Image from 'next/image';
// import { RefreshCw, LogOut } from 'lucide-react';
// import { createClient } from '@/utils/supabase/client';
// import { useRouter } from 'next/navigation';

// export function Sidebar() {
//   const supabase = createClient();
//   const router = useRouter();

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push('/signin');
//   };

//   return (
//     <header className="h-[64px] bg-white border-b border-gray-200 flex items-center justify-between px-8">
//       {/* Left */}
//       <div className="flex items-center gap-4">
//         <Image src="/logo.png" alt="Logo" width={32} height={32} />
//         <div>
//           <p className="text-[18px] font-semibold text-slate-800">
//             Dashboard
//           </p>
//           <p className="text-[13px] text-slate-500">
//             Welcome, Carl Care
//           </p>
//         </div>
//       </div>

//       {/* Right */}
//       <div className="flex items-center gap-6">
//         <button className="text-slate-600 hover:text-slate-800">
//           <RefreshCw size={20} />
//         </button>

//         <button
//           onClick={handleLogout}
//           className="flex items-center gap-2 text-[14px] font-medium text-slate-700 hover:text-slate-900"
//         >
//           <LogOut size={18} />
//           Sign Out
//         </button>
//       </div>
//     </header>
//   );
// }










// // components\Sidebar.tsx
// 'use client';

// import Link from 'next/link';
// import { usePathname, useRouter } from 'next/navigation';
// import { createClient } from '@/utils/supabase/client';
// import {
//   Plus,
//   Clock,
//   Search,
//   LogOut,
//   Shield,
// } from 'lucide-react';
// import Image from 'next/image';
// import { useEffect, useState } from 'react';

// const navItems = [
//   {
//     href: '/dashboard/new-shipment',
//     label: 'New Shipment',
//     icon: Plus,
//   },
//   {
//     href: '/dashboard/history',
//     label: 'Logistic History',
//     icon: Clock,
//   },
//   {
//     href: '/dashboard/tracking',
//     label: 'Live Tracking',
//     icon: Search,
//   },
// ];

// export function Sidebar() {
//   const pathname = usePathname();
//   const router = useRouter();
//   const supabase = createClient();
//   const [userRole, setUserRole] = useState<string | null>(null);

//   useEffect(() => {
//     const getUserRole = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (user) {
//         const { data: userData } = await supabase
//           .from('users')
//           .select('role')
//           .eq('id', user.id)
//           .single();
//         setUserRole(userData?.role || 'user');
//       }
//     };

//     getUserRole();
//   }, [supabase]);

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     router.push('/signin');
//   };

//   return (
//     <aside className="w-[240px] bg-white border-r border-[#ECECEC] flex flex-col ">
//       {/* Logo */}
//       <div className="mt-[6px] flex justify-center">
//         <Image
//           src="/logo.png"
//           alt="Bold Reach"
//           width={90}
//           height={90}
//           className=" object-contain"
//         />
//       </div>

//       <div className="mx-6 border-b border-[#ECECEC]" />

//       {/* Navigation */}
//       <nav className="flex-1 px-6 pt-8 space-y-4">
//         {navItems.map(({ href, label, icon: Icon }) => {
//           const isActive = pathname === href;

//           return (
//             <Link
//               key={href}
//               href={href}
//               className={`
//                 flex items-center gap-3 px-4 py-3 text-sm font-medium transition
//                 ${
//                   isActive
//                     ? 'bg-[#F97316] text-white rounded-xl'
//                     : 'text-[#8B8F97] hover:bg-[#F8F8F8] rounded-xl'
//                 }
//               `}
//             >
//               <Icon
//                 size={18}
//                 className={isActive ? 'text-white' : 'text-[#8B8F97]'}
//               />
//               {label}
//             </Link>
//           );
//         })}

//         {/* Admin Panel Link - Only show for admin users */}
//         {userRole === 'admin' && (
//           <Link
//             href="/admin/dashboard"
//             className={`
//               flex items-center gap-3 px-4 py-3 text-sm font-medium transition rounded-xl
//               ${
//                 pathname.startsWith('/admin')
//                   ? 'bg-[#F97316] text-white'
//                   : 'text-[#8B8F97] hover:bg-[#F8F8F8]'
//               }
//             `}
//           >
//             <Shield
//               size={18}
//               className={pathname.startsWith('/admin') ? 'text-white' : 'text-[#8B8F97]'}
//             />
//             Admin Panel
//           </Link>
//         )}
//       </nav>

//       {/* Sign Out */}
//       <div className="px-6 pb-6">
//         <button
//           onClick={handleLogout}
//           className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-600 transition"
//         >
//           <LogOut size={18} />
//           Sign Out
//         </button>
//       </div>
//     </aside>
//   );
// }





'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Clock, Search } from 'lucide-react';

const tabs = [
  {
    label: 'New Shipment',
    href: '/dashboard/new-shipment',
    icon: Plus,
  },
  {
    label: 'Logistic History',
    href: '/dashboard/history',
    icon: Clock,
  },
  {
    label: 'Live Tracking',
    href: '/dashboard/tracking',
    icon: Search,
  },
];

export function Tabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex gap-2 p-4 border-b border-gray-200">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            className="relative px-5 py-2 rounded-lg text-[14px] font-medium cursor-pointer"
          >
            {active && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 rounded-lg bg-[#2F3349]"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            <span
              className={`relative z-10 flex items-center gap-2 ${
                active ? 'text-white' : 'text-slate-500'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
