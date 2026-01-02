// app/admin/users/page.tsx
// Admin User Management - app/page-path: /admin/users

'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
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

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, currentPage]);

  const fetchUsers = async () => {
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
  };

  const updateUserRole = async (userId: string, newRole: 'user' | 'admin') => {
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
      <div>
        <h1 className="text-3xl font-bold text-[#1E293B] mb-2">User Management</h1>
        <p className="text-[#475569]">Manage user accounts and permissions</p>
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
                    <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
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
                      onChange={(e) => updateUserRole(user.id, e.target.value as 'user' | 'admin')}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
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
                <Badge variant={user.role === 'admin' ? 'success' : 'default'}>
                  {user.role === 'admin' ? 'Admin' : 'User'}
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
                  onChange={(e) => updateUserRole(user.id, e.target.value as 'user' | 'admin')}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
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
    </div>
  );
}