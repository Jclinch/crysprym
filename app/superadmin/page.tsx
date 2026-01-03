// app/superadmin/page.tsx

import { redirect } from 'next/navigation';

export default function SuperAdminIndex() {
  redirect('/superadmin/dashboard');
}
