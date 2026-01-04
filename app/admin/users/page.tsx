// app/admin/users/page.tsx
// Admin User Management - app/page-path: /admin/users

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LOCATIONS } from '@/lib/locations';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin' | 'superadmin';
  location?: string | null;
  createdAt: string;
  lastSignIn?: string;
  shipmentCount: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string>('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user' as 'user' | 'admin',
    location: '',
  });

  const locations = useMemo(() => [...LOCATIONS], []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchTerm,
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, searchTerm, currentPage]);

  const updateUserRole = async (userId: string, newRole: User['role'], currentRole?: User['role']) => {
    if (currentRole === 'superadmin' && newRole !== 'superadmin') {
      const ok = window.confirm('You are about to remove SuperAdmin privileges from this user. Continue?');
      if (!ok) return;
    }
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Refresh the users list
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user role:', error);
    }
  };

  const updateUserLocation = async (userId: string, location: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user location:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data?.error || 'Failed to create user');
        return;
      }

      setIsCreateOpen(false);
      setCreateForm({ email: '', fullName: '', password: '', role: 'user', location: '' });
      fetchUsers();
    } catch {
      setCreateError('Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const formatDate = (date: string) => {
    try {
      // Use browser locale and local timezone
      return new Date(date).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">User Management</h1>
          <p className="text-[#475569]">Loading users...</p>
        </div>
        <Card>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">User Management</h1>
          <p className="text-[#475569]">Create user accounts and manage permissions</p>
        </div>
        <div>
          <Button onClick={() => setIsCreateOpen(true)}>Create User</Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-[#1E293B] mb-2">
              Search by Email or Name
            </label>
            <Input
              type="text"
              placeholder="Enter email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchTerm('');
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto"
          >
            Clear Search
          </Button>
        </div>
      </Card>

      {/* Users Table */}
      <Card>
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">User</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Role</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Location</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Shipments</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Last Sign In</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Created</th>
                <th className="text-left py-3 px-4 font-medium text-[#1E293B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#E2E8F0]">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-[#1E293B]">{user.fullName}</p>
                      <p className="text-sm text-[#94A3B8]">{user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={user.role === 'superadmin' ? 'success' : user.role === 'admin' ? 'success' : 'default'}>
                      {user.role === 'superadmin' ? 'SuperAdmin' : user.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </td>

                  <td className="py-3 px-4">
                    {user.role === 'superadmin' ? (
                      <span className="text-sm text-[#94A3B8]">{user.location || '—'}</span>
                    ) : (
                      <select
                        className="text-sm border border-[#E2E8F0] rounded px-2 py-1 bg-white"
                        value={user.location || ''}
                        onChange={(e) => updateUserLocation(user.id, e.target.value)}
                      >
                        <option value="">Select location</option>
                        {locations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>

                  <td className="py-3 px-4">{user.shipmentCount}</td>
                  <td className="py-3 px-4 text-sm text-[#94A3B8]">
                    {user.lastSignIn ? formatDate(user.lastSignIn) : 'Never'}
                  </td>
                  <td className="py-3 px-4 text-sm text-[#94A3B8]">{formatDate(user.createdAt)}</td>
                  <td className="py-3 px-4">
                    <select
                      className="text-sm border border-[#E2E8F0] rounded px-2 py-1"
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as User['role'], user.role)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="superadmin">SuperAdmin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-[#1E293B] truncate">{user.fullName}</div>
                  <div className="text-sm text-[#94A3B8] truncate">{user.email}</div>
                </div>
                <Badge variant={user.role === 'superadmin' ? 'success' : user.role === 'admin' ? 'success' : 'default'}>
                  {user.role === 'superadmin' ? 'SuperAdmin' : user.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-[#94A3B8]">Shipments</div>
                  <div className="text-[#1E293B] font-medium">{user.shipmentCount}</div>
                </div>
                <div>
                  <div className="text-[#94A3B8]">Created</div>
                  <div className="text-[#1E293B] font-medium">{formatDate(user.createdAt)}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-[#94A3B8]">Location</div>
                  {user.role === 'superadmin' ? (
                    <div className="text-[#1E293B] font-medium">{user.location || '—'}</div>
                  ) : (
                    <select
                      className="w-full text-sm border border-[#E2E8F0] rounded px-3 py-2 bg-white"
                      value={user.location || ''}
                      onChange={(e) => updateUserLocation(user.id, e.target.value)}
                    >
                      <option value="">Select location</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="col-span-2">
                  <div className="text-[#94A3B8]">Last Sign In</div>
                  <div className="text-[#1E293B] font-medium">
                    {user.lastSignIn ? formatDate(user.lastSignIn) : 'Never'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-[#94A3B8] mb-2">Role</label>
                <select
                  className="w-full text-sm border border-[#E2E8F0] rounded px-3 py-2 bg-white"
                  value={user.role}
                  onChange={(e) => updateUserRole(user.id, e.target.value as User['role'], user.role)}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button
              variant="secondary"
              size="small"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-[#94A3B8]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="small"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </Card>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsCreateOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#1E293B]">Create User</h2>
                <p className="text-sm text-[#64748B]">SuperAdmin creates accounts (signup is disabled)</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-md hover:bg-gray-100"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Full Name</label>
                <Input
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Email</label>
                <Input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">Password</label>
                <Input
                  type={showCreatePassword ? 'text' : 'password'}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  endAdornment={
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword((v) => !v)}
                      className="p-1 rounded hover:bg-gray-100 text-[#64748B]"
                      aria-label={showCreatePassword ? 'Hide password' : 'Show password'}
                    >
                      {showCreatePassword ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M10.733 5.076a10.744 10.744 0 0 1 1.267-.076c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                          <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
                          <path d="M9.88 9.88A3 3 0 0 1 14.12 14.12" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Role</label>
                  <select
                    className="w-full text-sm border border-[#E2E8F0] rounded px-3 py-2 bg-white"
                    value={createForm.role}
                    onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as 'user' | 'admin' }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1">Location</label>
                  <select
                    className="w-full text-sm border border-[#E2E8F0] rounded px-3 py-2 bg-white"
                    value={createForm.location}
                    onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {createError && (
                <div className="text-sm text-red-600">{createError}</div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={createLoading} disabled={createLoading}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}