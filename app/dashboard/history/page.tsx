// app/dashboard/history/page.tsx
// Logistic History Page - app/page-path: /dashboard/history
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
import { Tabs } from '@/components/Sidebar';
import { downloadCsv, toCsv } from '@/utils/csv';

interface ShipmentRow {
  id: string;
  tracking_number?: string;
  trackingNumber?: string;
  origin_location?: string;
  destination?: string;
  delivery_location?: string;
  items_description?: string;
  itemsDescription?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  shipment_date?: string;
  latest_event_time?: string;
  estimated_delivery_date?: string;
}

export default function HistoryPage() {
  const supabase = createClient();
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    let isMounted = true;
    const fetchShipments = async () => {
      setIsLoading(true);
      try {
        // Get authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Not authenticated');
          if (isMounted) setShipments([]);
          setIsLoading(false);
          return;
        }

        // Build base query
        let query = supabase
          .from('shipments')
          .select('*')
          .order('created_at', { ascending: false });

        // Apply status filter
        if (filterStatus !== 'all') {
          const dbStatus = filterStatus === 'pending' ? 'created' : filterStatus;
          query = query.eq('status', dbStatus);
        }

        // Execute query
        const { data, error } = await query;

        if (error) {
          console.error('Failed to fetch shipments', error);
          if (isMounted) setShipments([]);
          return;
        }

        // Apply search filter (client-side)
        let filtered = Array.isArray(data) ? data : [];
        if (searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          filtered = filtered.filter(
            (ship) =>
              (ship.tracking_number || '').toLowerCase().includes(searchLower) ||
              (ship.destination || '').toLowerCase().includes(searchLower) ||
              (ship.items_description || '').toLowerCase().includes(searchLower) ||
              (ship.origin_location || '').toLowerCase().includes(searchLower)
          );
        }

        if (isMounted) setShipments(filtered);
      } catch (error) {
        console.error('Failed to fetch shipments:', error);
        if (isMounted) setShipments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    // Small debounce for search
    const t = setTimeout(fetchShipments, 250);
    return () => {
      isMounted = false;
      clearTimeout(t);
    };
  }, [searchTerm, filterStatus, supabase]);

  const getStatusBadgeVariant = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'delivered':
        return 'success';
      case 'in_transit':
      case 'in-transit':
        return 'default';
      case 'pending':
      case 'created':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return 'Unknown';
    // Map 'created' to 'Pending'
    if (status.toLowerCase() === 'created') {
      return 'Pending';
    }
    return status
      .toString()
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDateOnly = (value?: string) => {
    if (!value) return '';
    try {
      // shipment_date often comes as YYYY-MM-DD; make it stable across timezones
      const isPlainDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
      const d = new Date(isPlainDate ? `${value}T00:00:00` : value);
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return value;
    }
  };

  // normalize each row to the fields our UI uses
  const normalize = (row: ShipmentRow) => {
    return {
      id: row.id,
      trackingNumber: (row.trackingNumber || row.tracking_number || '').toString(),
      origin: (row.origin_location || '').toString(),
      destination: (row.destination || row.delivery_location || '').toString(),
      description: (row.itemsDescription || row.items_description || '').toString(),
      status: (row.status || '').toString(),
      shipmentDate: (row.shipment_date || '').toString(),
      createdAt: (row.createdAt || row.created_at || '').toString(),
      dateTime: (row.latest_event_time || row.createdAt || row.created_at || '').toString(),
      estimatedDelivery: (row.estimated_delivery_date || '').toString(),
    };
  };

  const handleExportCsv = () => {
    const rows = shipments.map((s) => {
      const row = normalize(s);
      return {
        trackingNumber: row.trackingNumber || '—',
        origin: row.origin || '—',
        destination: row.destination || '—',
        description: row.description || '—',
        status: getStatusLabel(row.status),
        shipmentDate: formatDateOnly(row.shipmentDate) || formatDateOnly(row.createdAt) || '',
      };
    });

    const csv = toCsv(rows, [
      { key: 'trackingNumber', header: 'Waybill Number' },
      { key: 'origin', header: 'Origin' },
      { key: 'destination', header: 'Destination' },
      { key: 'description', header: 'Description' },
      { key: 'status', header: 'Status' },
      { key: 'shipmentDate', header: 'Shipment Date' },
    ]);

    downloadCsv(`shipment-history-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  return (
  <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-full mx-auto"
      >
        <div className=" bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <Tabs />      
          <div className="p-4 sm:p-8">
        
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">Logistics History</h1>
          <p className="text-[#475569]">View and manage all your shipments</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm text-slate-600 mb-2 block">Items Description</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by Waybill Number, address, or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-600 mb-2 block"> &nbsp;</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="secondary"
                  onClick={handleExportCsv}
                  disabled={isLoading || shipments.length === 0}
                  className="h-11"
                >
                  Export CSV
                </Button>

                <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 text-sm rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] focus:border-[#2563EB] focus:outline-none focus:ring-3 focus:ring-opacity-10 focus:ring-[#2563EB] appearance-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <svg className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#94A3B8] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-[#94A3B8]">Loading shipments...</p>
          </div>
        ) : shipments.length === 0 ? (
          <div className="text-center py-12">
            {/* Placeholder illustration (large) */}
            <div className="mx-auto max-w-[720px]">
             <Image
              src="/feeling.png"
              alt="No History Illustration"
              width={400}
              height={300}
              className="mx-auto mb-6"
             />
            </div>

            <p className="text-gray-950 mt-6 mb-6">You do not any have History</p>
           
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-md shadow-sm">
              <div className="bg-[#0F2940] text-white grid grid-cols-5 gap-4 items-center px-6 py-4 text-sm font-medium">
                <div>Waybill Number</div>
                <div>Destination</div>
                <div>Description</div>
                <div>Status</div>
                <div className="text-right">Shipment Date</div>
              </div>

              <div className="bg-white divide-y divide-gray-100">
                {shipments.map((s) => {
                  const row = normalize(s);
                  const displayDate = formatDateOnly(row.shipmentDate) || formatDateOnly(row.createdAt) || '';
                  return (
                    <div key={row.id} className="grid grid-cols-5 gap-4 items-center px-6 py-6">
                      <div className="text-sm font-semibold text-[#0F2940]">{row.trackingNumber || '—'}</div>
                      <div className="text-sm text-[#475569]">{row.destination || '—'}</div>
                      <div className="text-sm text-[#475569]">{row.description || '—'}</div>
                      <div>
                        <Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
                      </div>
                      <div className="text-right text-sm text-[#94A3B8]">
                        {displayDate}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {shipments.map((s) => {
                const row = normalize(s);
                const displayDate = formatDateOnly(row.shipmentDate) || formatDateOnly(row.createdAt) || '';
                return (
                  <div key={row.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#94A3B8]">Waybill Number</div>
                        <div className="text-base font-semibold text-[#0F2940]">{row.trackingNumber || '—'}</div>
                      </div>
                      <div>
                        <Badge variant={getStatusBadgeVariant(row.status)}>{getStatusLabel(row.status)}</Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      <div>
                        <div className="text-[#94A3B8]">Destination</div>
                        <div className="text-[#475569]">{row.destination || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[#94A3B8]">Description</div>
                        <div className="text-[#475569]">{row.description || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[#94A3B8]">Shipment Date</div>
                        <div className="text-[#475569]">{displayDate || '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      </div>
      </motion.div>
    </DashboardLayout>
  );
}