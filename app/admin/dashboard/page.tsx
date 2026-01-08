// // app/admin/dashboard/page.tsx
// // Admin Dashboard - app/page-path: /admin/dashboard



'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { Card } from '@/components/Card';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Box, Truck, Users, Crown, Filter, X, Package, ChevronDown } from 'lucide-react';
import { downloadCsv, toCsv } from '@/utils/csv';

const MAX_PACKAGE_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PACKAGE_IMAGE_LABEL = '10MB';

interface ShipmentRow {
  id: string;
  tracking_number?: string;
  trackingNumber?: string;
  shipment_date?: string;
  destination?: string;
  delivery_location?: string;
  origin_location?: string;
  receiver_contact?: { phone?: string; email?: string } | null;
  items_description?: string;
  itemsDescription?: string;
  description?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
  latest_event_time?: string;
  sender_name?: string;
  senderName?: string;
  progress_step?: string;
  weight?: number | string | null;
  package_quantity?: number | null;
}

interface NormalizedShipment {
  id: string;
  trackingNumber: string;
  status: string;
  progressStep: string;
  senderName: string;
  description: string;
  originLocation: string;
  destination: string;
  receiverPhone: string;
  weightKg: string;
  packageQuantity: string;
  createdAt: string;
  shipmentDate: string;
}

interface DashboardStats {
  totalShipments: number;
  activeShipments: number;
  totalUsers: number;
  adminUsers: number;
  recentShipments: ShipmentRow[];
  isSuperadmin?: boolean;
}

// Detailed shipment data from Supabase for modal
interface ShipmentDetails {
  id: string;
  user_id: string | null;
  sender_name: string;
  sender_contact: { phone?: string; email?: string } | null;
  receiver_name: string;
  receiver_contact: { phone?: string; email?: string } | null;
  items_description: string;
  weight: number | null;
  package_quantity: number | null;
  origin_location: string | null;
  destination: string | null;
  package_image_url: string | null;
  status: string;
  tracking_number: string | null;
  progress_step: string;
  shipment_date: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [shipments, setShipments] = useState<NormalizedShipment[]>([]);
  const [shipmentsLoading, setShipmentsLoading] = useState(true);
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [shipmentsPageSize, setShipmentsPageSize] = useState(20);
  const [shipmentsTotalCount, setShipmentsTotalCount] = useState(0);
  const [shipmentsTotalPages, setShipmentsTotalPages] = useState(1);
  
  // Modal state
  const [selectedShipment, setSelectedShipment] = useState<NormalizedShipment | null>(null);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newReceiverName, setNewReceiverName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  // Waybill editing removed from admin; users provide on creation
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [locations, setLocations] = useState<string[]>([]);
  
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Reset to page 1 when filters/page size change
  useEffect(() => {
    setShipmentsPage(1);
  }, [search, statusFilter, shipmentsPageSize]);

  useEffect(() => {
    let mounted = true;
    const loadLocations = async () => {
      try {
        const res = await fetch('/api/locations');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.locations) ? data.locations : [];
        type LocationApiRow = { name?: string | null };
        const names = (list as LocationApiRow[])
          .map((l) => (l?.name || '').toString())
          .filter(Boolean);
        if (mounted) setLocations(names);
      } catch {
        // ignore
      }
    };
    loadLocations();
    return () => {
      mounted = false;
    };
  }, []);

  // Reusable fetch function for shipments
  const fetchShipments = useCallback(async (showLoading = true) => {
    if (showLoading) setShipmentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', String(shipmentsPageSize));
      params.set('page', String(shipmentsPage));
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: ShipmentRow[] = data?.shipments || data || [];
        const list: NormalizedShipment[] = rawList.map(normalize);

        const totalCount = Number(data?.totalCount ?? data?.total_count ?? 0) || 0;
        const totalPages = Math.max(1, Number(data?.totalPages ?? data?.total_pages ?? 1) || 1);

        // If filters changed and current page is now out of range, clamp and refetch.
        if (shipmentsPage > totalPages && totalCount > 0) {
          setShipmentsPage(totalPages);
          return;
        }

        setShipmentsTotalCount(totalCount);
        setShipmentsTotalPages(totalPages);
        setShipments(list);
      } else {
        setShipmentsTotalCount(0);
        setShipmentsTotalPages(1);
        setShipments([]);
      }
    } catch (e) {
      console.error('Failed to fetch admin shipments:', e);
      setShipmentsTotalCount(0);
      setShipmentsTotalPages(1);
      setShipments([]);
    } finally {
      if (showLoading) setShipmentsLoading(false);
    }
  }, [search, statusFilter, shipmentsPage, shipmentsPageSize]);

  // Fetch shipments when search or filter changes (with debounce)
  useEffect(() => {
    const t = setTimeout(() => fetchShipments(true), 250);
    return () => clearTimeout(t);
  }, [fetchShipments]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Silent background refresh (don't show loading state)
      fetchShipments(false);
      // Also refresh dashboard stats
      fetchDashboardStats();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchShipments]);

  const fetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.warn('Failed to fetch dashboard stats');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Normalize each row to consistent field names (same pattern as user history page)
  const normalize = (row: ShipmentRow): NormalizedShipment => {
    // Always derive display status from the 'status' column (shipment_status enum)
    // because progress_step defaults to 'pending' and may not reflect actual status
    const status = (row.status || '').toString().toLowerCase();
    
    // Map shipment_status to display status
    // shipment_status enum: draft, created, confirmed, in_transit, delivered, cancelled, returned
    let displayStatus: string;
    switch (status) {
      case 'draft':
        displayStatus = 'draft';
        break;
      case 'created':
        displayStatus = 'pending';
        break;
      case 'confirmed':
        displayStatus = 'confirmed';
        break;
      case 'in_transit':
        displayStatus = 'in_transit';
        break;
      case 'delivered':
        displayStatus = 'delivered';
        break;
      case 'cancelled':
        displayStatus = 'cancelled';
        break;
      case 'returned':
        displayStatus = 'returned';
        break;
      default:
        displayStatus = status || 'pending';
    }
    
    return {
      id: row.id,
      trackingNumber: (row.trackingNumber || row.tracking_number || '').toString(),
      originLocation: (row.origin_location || '').toString(),
      destination: (row.destination || row.delivery_location || '').toString(),
      receiverPhone: (row.receiver_contact?.phone || '').toString(),
      description: (row.items_description || row.itemsDescription || row.description || '').toString(),
      status: status,
      progressStep: displayStatus,
      senderName: (row.senderName || row.sender_name || '').toString(),
      weightKg: row.weight == null ? '' : String(row.weight),
      packageQuantity: row.package_quantity == null ? '' : String(row.package_quantity),
      createdAt: (row.createdAt || row.created_at || row.latest_event_time || '').toString(),
      shipmentDate: (row.shipment_date || '').toString(),
    };
  };

  const fetchDeliveredDates = useCallback(
    async (shipmentIds: string[]) => {
      const uniqueIds = Array.from(new Set(shipmentIds)).filter(Boolean);
      if (uniqueIds.length === 0) return {} as Record<string, string>;

      const { data, error } = await supabase
        .from('shipment_events')
        .select('shipment_id,event_time')
        .eq('event_type', 'delivered')
        .in('shipment_id', uniqueIds);

      if (error) {
        console.error('Failed to fetch delivered events:', error);
        return {} as Record<string, string>;
      }

      const deliveredAtByShipmentId: Record<string, string> = {};
      type DeliveredEventRow = { shipment_id: string; event_time: string };
      const rows = (data || []) as unknown as DeliveredEventRow[];
      for (const row of rows) {
        const shipmentId = row.shipment_id;
        const eventTime = row.event_time;
        if (!shipmentId || !eventTime) continue;

        const existing = deliveredAtByShipmentId[shipmentId];
        if (!existing) {
          deliveredAtByShipmentId[shipmentId] = eventTime;
          continue;
        }

        const existingTime = new Date(existing).getTime();
        const nextTime = new Date(eventTime).getTime();
        if (Number.isFinite(nextTime) && (!Number.isFinite(existingTime) || nextTime > existingTime)) {
          deliveredAtByShipmentId[shipmentId] = eventTime;
        }
      }

      return deliveredAtByShipmentId;
    },
    [supabase]
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const formatDateOnly = (value?: string) => {
    if (!value) return '';
    try {
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

  const handleExportShipmentsCsv = async () => {
    // Export all shipments matching current filters (not just current page).
    let exportShipments: NormalizedShipment[] = shipments;
    try {
      const params = new URLSearchParams();
      params.set('limit', '5000');
      params.set('page', '1');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: ShipmentRow[] = data?.shipments || data || [];
        exportShipments = rawList.map(normalize);
      }
    } catch {
      // Fall back to current page
      exportShipments = shipments;
    }

    const deliveredAtById = await fetchDeliveredDates(exportShipments.map((s) => s.id));

    const rows = exportShipments.map((s) => {
      const shipmentDate = formatDateOnly(s.shipmentDate) || formatDateOnly(s.createdAt) || '';
      const deliveredAt = deliveredAtById[s.id];
      const deliveryDate = deliveredAt ? formatDateOnly(deliveredAt) : '';
      return {
        trackingNumber: s.trackingNumber || '—',
        senderName: s.senderName || '—',
        originLocation: s.originLocation || '—',
        destination: s.destination || '—',
        receiverPhone: s.receiverPhone || '—',
        weightKg: s.weightKg || '—',
        packageQuantity: s.packageQuantity || '—',
        description: s.description || '—',
        status: getStatusLabel(s.progressStep),
        shipmentDate,
        deliveryDate: deliveryDate || '—',
      };
    });

    const csv = toCsv(rows, [
      { key: 'trackingNumber', header: 'Waybill Number' },
      { key: 'senderName', header: 'Sender' },
      { key: 'originLocation', header: 'Origin' },
      { key: 'destination', header: 'Destination' },
      { key: 'receiverPhone', header: 'Receiver Phone' },
      { key: 'weightKg', header: 'Weight (kg)' },
      { key: 'packageQuantity', header: 'Package Quantity' },
      { key: 'description', header: 'Description' },
      { key: 'status', header: 'Status' },
      { key: 'shipmentDate', header: 'Shipment Date' },
      { key: 'deliveryDate', header: 'Delivery Date' },
    ]);

    downloadCsv(`shipment-management-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  // Get display label for status/progress_step
  const getStatusLabel = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'draft') return 'Draft';
    if (s === 'created' || s === 'pending') return 'Pending';
    if (s === 'confirmed') return 'Confirmed';
    if (s === 'in_transit') return 'In Transit';
    if (s === 'out_for_delivery') return 'Out for Delivery';
    if (s === 'delivered') return 'Delivered';
    if (s === 'cancelled') return 'Cancelled';
    if (s === 'returned') return 'Returned';
    return status?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';
  };

  // Get custom inline styles for specific statuses
  const getStatusStyle = (status: string): React.CSSProperties => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'draft':
        return { backgroundColor: '#9CA3AF', color: '#FFFFFF' }; // Gray
      case 'created':
      case 'pending':
        return { backgroundColor: '#FF8D28', color: '#FFFFFF' }; // Orange
      case 'confirmed':
        return { backgroundColor: '#8B5CF6', color: '#FFFFFF' }; // Purple
      case 'in_transit':
      case 'in transit':
        return { backgroundColor: '#00C8B3', color: '#FFFFFF' }; // Teal
      case 'out_for_delivery':
      case 'out for delivery':
        return { backgroundColor: '#3B82F6', color: '#FFFFFF' }; // Blue
      case 'delivered':
        return { backgroundColor: '#34C759', color: '#FFFFFF' }; // Green
      case 'cancelled':
        return { backgroundColor: '#EF4444', color: '#FFFFFF' }; // Red
      case 'returned':
        return { backgroundColor: '#F59E0B', color: '#FFFFFF' }; // Amber
      default:
        return { backgroundColor: '#6B7280', color: '#FFFFFF' }; // Default gray
    }
  };

  // Modal handlers
  const openModal = async (shipment: NormalizedShipment) => {
    if (!stats?.isSuperadmin) return;
    setSelectedShipment(shipment);
    setNewStatus(shipment.progressStep);
    setIsModalOpen(true);
    setIsModalLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipment.id)
        .single();
      
      if (error) {
        console.error('Failed to fetch shipment details:', error);
      } else {
        setShipmentDetails(data);

        setNewReceiverName((data?.receiver_name || '').toString());
        setNewWeight(data?.weight != null ? String(data.weight) : '');

        // Use progress_step for the dropdown (fallback to status-based mapping)
        const progressStep = data.progress_step || 
          (data.status === 'created' ? 'pending' : 
           data.status === 'delivered' ? 'delivered' : 
           data.status === 'in_transit' ? 'in_transit' : 'pending');
        setNewStatus(progressStep);
      }
    } catch (e) {
      console.error('Failed to fetch shipment details:', e);
    } finally {
      setIsModalLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedShipment(null);
    setShipmentDetails(null);
    setNewStatus('');
    setNewLocation('');
    setNewReceiverName('');
    setNewWeight('');
    setNewImageFile(null);
    setNewImagePreview('');
    setUploadingImage(false);
    setIsDeleting(false);
  };

  const handleDeleteShipment = async () => {
    if (!selectedShipment) return;
    const ok = window.confirm(
      `Delete shipment ${selectedShipment.trackingNumber || ''}? This cannot be undone.`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/shipments/${selectedShipment.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || 'Failed to delete shipment';
        const details = err.details ? ` (${err.details})` : '';
        console.error('Delete shipment API error:', { status: res.status, error: err });
        alert(errorMsg + details);
        return;
      }

      setShipments((prev) => prev.filter((s) => s.id !== selectedShipment.id));
      closeModal();
    } catch (e) {
      console.error('Failed to delete shipment (network/exception):', e);
      alert('Failed to delete shipment: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedShipment || !newStatus) return;
    
    setIsUpdating(true);
    try {
      let packageImageBucket = '';
      let packageImagePath = '';
      let packageImageUrl = '';

      // If admin picked an image, upload to Supabase Storage first
      if (newImageFile) {
        try {
          setUploadingImage(true);
          const fileName = `${selectedShipment.id}-${Date.now()}-${newImageFile.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('package-images')
            .upload(fileName, newImageFile, { upsert: true });

          if (uploadError) {
            console.error('Image upload error:', uploadError);
          } else if (uploadData) {
            packageImageBucket = 'package-images';
            packageImagePath = uploadData.path;
            const { data: pub } = supabase.storage
              .from('package-images')
              .getPublicUrl(uploadData.path);
            packageImageUrl = pub?.publicUrl || '';
          }
        } finally {
          setUploadingImage(false);
        }
      }

      let weightNumber: number | undefined;
      if (newWeight.trim()) {
        const parsed = Number(newWeight);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          alert('Weight must be a valid number greater than 0');
          return;
        }
        weightNumber = parsed;
      }

      const res = await fetch(`/api/admin/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          location: newLocation,
          receiverName: newReceiverName,
          weight: weightNumber,
          packageImageBucket,
          packageImagePath,
          packageImageUrl,
        }),
      });
      
      if (res.ok) {
        // Update local state with both status, progressStep, and destination
        setShipments((prev) =>
          prev.map((s) =>
            s.id === selectedShipment.id 
              ? { 
                  ...s, 
                  status: newStatus, 
                  progressStep: newStatus,
                  destination: newLocation.trim() || s.destination
                } 
              : s
          )
        );
        closeModal();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update shipment');
      }
    } catch (e) {
      console.error('Failed to update shipment:', e);
      alert('Failed to update shipment');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-2">Admin Dashboard</h1>
          <p className="text-[#475569]">Welcome back — loading overview...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <div className="animate-pulse h-24" />
            </Card>
          ))}
        </div>

        <Card>
          <div className="animate-pulse h-48" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1E293B] mb-1">Welcome Back</h1>
        <p className="text-[#475569]">Here’s your logistics overview for today</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#94A3B8] mb-2">Total Shipments</p>
              <p className="text-3xl font-bold text-[#1E293B]">{stats?.totalShipments ?? 0}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#EEF2F6]">
              <Box className="text-[#2563EB]" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-[#94A3B8] mb-2">Active Shipments</p>
              <p className="text-3xl font-bold text-[#1E293B]">{stats?.activeShipments ?? 0}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#FFF7ED]">
              <Truck className="text-[#F97316]" />
            </div>
          </div>
        </Card>

        {stats?.isSuperadmin ? (
          <>
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#94A3B8] mb-2">Total Users</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{stats?.totalUsers ?? 0}</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#F0F9F4]">
                  <Users className="text-[#10B981]" />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-[#94A3B8] mb-2">Admin Users</p>
                  <p className="text-3xl font-bold text-[#1E293B]">{stats?.adminUsers ?? 0}</p>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#FFF7FE]">
                  <Crown className="text-[#6366F1]" />
                </div>
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-[#94A3B8] mb-2">Recent Activity</p>
                <p className="text-sm text-[#475569]">Shipments overview enabled</p>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#EEF2F6]">
                <Crown className="text-[#0F2940]" />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Shipment Management */}
      <Card id="shipments">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#1E293B]">
              {stats?.isSuperadmin ? 'Shipment Management' : 'Shipment Overview'}
            </h2>
            <p className="text-sm text-[#94A3B8]">
              {stats?.isSuperadmin
                ? 'Search, view, and update shipments'
                : 'Search and view shipments'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleExportShipmentsCsv}
              disabled={shipmentsLoading || shipments.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                id="admin-search"
                type="text"
                placeholder="Search by Waybill Number, address, or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-48">
              <div className="relative">
                {statusFilter === 'all' && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                    <Filter className="w-4 h-4" />
                  </span>
                )}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_transit">In Transit</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-sm text-[#64748B]">
            {shipmentsTotalCount > 0
              ? `Showing ${(shipmentsPage - 1) * shipmentsPageSize + 1}–${Math.min(
                  shipmentsPage * shipmentsPageSize,
                  shipmentsTotalCount
                )} of ${shipmentsTotalCount}`
              : 'Showing 0 results'}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B]">Rows</span>
              <select
                value={String(shipmentsPageSize)}
                onChange={(e) => setShipmentsPageSize(parseInt(e.target.value || '20', 10) || 20)}
                className="px-2 py-1.5 text-xs rounded-md border border-[#E2E8F0] bg-white text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <Button
              size="small"
              variant="secondary"
              onClick={() => setShipmentsPage((p) => Math.max(1, p - 1))}
              disabled={shipmentsLoading || shipmentsPage <= 1}
            >
              Prev
            </Button>

            <div className="text-xs text-[#64748B] px-2">
              Page {shipmentsPage} of {shipmentsTotalPages}
            </div>

            <Button
              size="small"
              variant="secondary"
              onClick={() => setShipmentsPage((p) => Math.min(shipmentsTotalPages, p + 1))}
              disabled={shipmentsLoading || shipmentsPage >= shipmentsTotalPages}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-hidden rounded-md border border-[#EEF2F6]">
          <div
            className={`bg-[#EFEFEF] text-gray-950 grid gap-4 items-center px-6 py-4 text-sm font-medium ${
              stats?.isSuperadmin ? 'grid-cols-9' : 'grid-cols-8'
            }`}
          >
            <div>Waybill Number</div>
            <div>Origin</div>
            <div>Destination</div>
            <div>Receiver Phone</div>
            <div>Pkg Qty</div>
            <div>Description</div>
            <div>Status</div>
            {stats?.isSuperadmin && <div>Action</div>}
            <div className="text-right">Shipment Date</div>
          </div>

          <div className="divide-y divide-gray-100 bg-white">
            {shipmentsLoading ? (
              <div className="p-8 text-center text-[#94A3B8]">Loading shipments...</div>
            ) : shipments.length > 0 ? (
              shipments.map((shipment) => {
                const displayDate = formatDateOnly(shipment.shipmentDate) || formatDateOnly(shipment.createdAt) || '';
                return (
                  <div
                    key={shipment.id}
                    className={`w-full text-left grid gap-4 items-center px-6 py-6 ${
                      stats?.isSuperadmin ? 'grid-cols-9' : 'grid-cols-8'
                    } hover:bg-[#F8FAFC] transition-colors`}
                  >
                    <div className="text-sm font-semibold text-[#0F2940]">
                      {shipment.trackingNumber}
                    </div>
                    <div className="text-sm text-[#475569] truncate">
                      {shipment.originLocation || '—'}
                    </div>
                    <div className="text-sm text-[#475569]">
                      {shipment.destination || '—'}
                    </div>
                    <div className="text-sm text-[#475569]">
                      {shipment.receiverPhone || '—'}
                    </div>
                    <div className="text-sm text-[#475569]">
                      {shipment.packageQuantity || '—'}
                    </div>
                    <div className="text-sm text-[#475569]">
                      {shipment.description || '—'}
                    </div>
                    <div className="text-sm mr-4">
                      <span
                        className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium"
                        style={getStatusStyle(shipment.progressStep)}
                      >
                        {getStatusLabel(shipment.progressStep)}
                      </span>
                    </div>
                    {stats?.isSuperadmin && (
                      <div>
                        <Button
                          size="small"
                          variant="secondary"
                          onClick={() => openModal(shipment)}
                        >
                          Update
                        </Button>
                      </div>
                    )}
                    <div className="text-right text-sm text-[#94A3B8]">
                      {displayDate || '—'}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-[#94A3B8]">No shipments found</div>
            )}
          </div>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {shipmentsLoading ? (
            <div className="p-6 text-center text-[#94A3B8]">Loading shipments...</div>
          ) : shipments.length > 0 ? (
            shipments.map((shipment) => {
              const displayDate = formatDateOnly(shipment.shipmentDate) || formatDateOnly(shipment.createdAt) || '';
              return (
                <div
                  key={shipment.id}
                  className="w-full text-left rounded-xl border border-[#E2E8F0] bg-white p-4 hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-[#94A3B8]">Waybill Number</div>
                      <div className="text-base font-semibold text-[#0F2940]">{shipment.trackingNumber || '—'}</div>
                    </div>
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
                      style={getStatusStyle(shipment.progressStep)}
                    >
                      {getStatusLabel(shipment.progressStep)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                    <div>
                      <div className="text-[#94A3B8]">Origin</div>
                      <div className="text-[#475569]">{shipment.originLocation || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#94A3B8]">Destination</div>
                      <div className="text-[#475569]">{shipment.destination || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#94A3B8]">Receiver Phone</div>
                      <div className="text-[#475569]">{shipment.receiverPhone || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#94A3B8]">Package Quantity</div>
                      <div className="text-[#475569]">{shipment.packageQuantity || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#94A3B8]">Description</div>
                      <div className="text-[#475569]">{shipment.description || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[#94A3B8]">Shipment Date</div>
                      <div className="text-[#475569]">{displayDate || '—'}</div>
                    </div>
                  </div>

                  {stats?.isSuperadmin && (
                    <div className="mt-4">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => openModal(shipment)}
                        className="w-full"
                      >
                        Update
                      </Button>
                    </div>
                  )}

                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-[#94A3B8]">No shipments found</div>
          )}
        </div>
      </Card>

      {/* Shipment Details Modal (SuperAdmin only) */}
      {stats?.isSuperadmin && isModalOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* Modal */}
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 p-6 max-h-[90vh] overflow-y-auto overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Close */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 p-2 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            {isModalLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-[#94A3B8]">Loading shipment details...</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* LEFT — Shipment Details */}
                <div className="border border-[#E5E7EB] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#1F2937] mb-4">
                    Shipment Details
                  </h3>

                  {/* Tracking */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-500">Waybill Number</p>
                    <p className="text-base font-semibold">
                      {shipmentDetails?.tracking_number || selectedShipment.trackingNumber || '—'}
                    </p>
                    <span
                      className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium"
                      style={getStatusStyle(shipmentDetails?.progress_step || selectedShipment.progressStep)}
                    >
                      {getStatusLabel(shipmentDetails?.progress_step || selectedShipment.progressStep)}
                    </span>
                  </div>

                  <div className="border-t my-4" />

                  {/* Grid */}
                  <div className="grid grid-cols-2 gap-y-6 text-sm">
                    <div>
                      <p className="text-gray-500">Sender&apos;s Name</p>
                      <p className="font-medium">{shipmentDetails?.sender_name || selectedShipment.senderName || '—'}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Receiver&apos;s Name</p>
                      <p className="font-medium">{shipmentDetails?.receiver_name || '—'}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Receiver&apos;s Phone</p>
                      <p className="font-medium">{shipmentDetails?.receiver_contact?.phone || '—'}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Origin Location</p>
                      <p className="font-medium">{shipmentDetails?.origin_location || '—'}</p>
                    </div>

                    <div>
                      <p className="text-gray-500">Destination</p>
                      <p className="font-medium">
                        {shipmentDetails?.destination || selectedShipment.destination || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Weight</p>
                      <p className="font-medium">
                        {shipmentDetails?.weight ? `${shipmentDetails.weight}kg` : '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Package Quantity</p>
                      <p className="font-medium">
                        {shipmentDetails?.package_quantity ?? '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Progress Step</p>
                      <p className="font-medium">
                        {shipmentDetails?.progress_step?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '—'}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <p className="text-gray-500">Description</p>
                      <p className="font-medium">
                        {shipmentDetails?.items_description || selectedShipment.description || '—'}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Shipment Date</p>
                      <p className="font-medium">
                        {shipmentDetails?.shipment_date
                          ? formatDateOnly(shipmentDetails.shipment_date)
                          : formatDateOnly(selectedShipment.shipmentDate) || formatDateOnly(selectedShipment.createdAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Last Updated</p>
                      <p className="font-medium">
                        {shipmentDetails?.updated_at ? formatDate(shipmentDetails.updated_at) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT — Update Status */}
                <div className="border border-[#E5E7EB] rounded-xl p-6 flex flex-col">
                  <h3 className="text-lg font-semibold text-[#1F2937] mb-6">
                    Update Shipment
                  </h3>

                  {/* Waybill Number — read-only (user-managed during creation) */}
                  <div className="mb-4">
                    <p className="text-sm mb-1 text-gray-600">Waybill Number</p>
                    <p className="text-base font-semibold">
                      {shipmentDetails?.tracking_number || selectedShipment.trackingNumber || '—'}
                    </p>
                  </div>

                  {/* Status */}
                  <label className="text-sm mb-1 text-gray-600">New Status</label>
                  <div className="relative mb-4">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm appearance-none bg-white focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_transit">In Transit</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Receiver Name */}
                  <label className="text-sm mb-1 text-gray-600">Receiver Name</label>
                  <div className="mb-4">
                    <Input
                      value={newReceiverName}
                      onChange={(e) => setNewReceiverName(e.target.value)}
                      placeholder="Receiver name"
                      className="w-full"
                    />
                  </div>

                  {/* Weight */}
                  <label className="text-sm mb-1 text-gray-600">Weight (kg)</label>
                  <div className="mb-4">
                    <Input
                      value={newWeight}
                      onChange={(e) => setNewWeight(e.target.value)}
                      placeholder="e.g. 2.5"
                      inputMode="decimal"
                      className="w-full"
                    />
                  </div>

                  {/* Location */}
                  <label className="text-sm mb-1 text-gray-600">Location</label>
                  <div className="relative mb-4">
                    <select
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm appearance-none bg-white focus:border-[#2563EB] focus:outline-none"
                    >
                      <option value="">Select location (optional)</option>
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Upload / Replace Image */}
                  <label className="text-sm mb-2 text-gray-600">Add/Replace Image</label>
                  <label className="flex-1 min-h-[120px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-sm text-gray-600 cursor-pointer hover:border-gray-400 transition-colors">
                    <Package className="w-8 h-8 mb-2" />
                    <span>{newImageFile ? 'Image selected — will upload on update' : 'Browse and choose the file to upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) return;
                        if (file.size > MAX_PACKAGE_IMAGE_BYTES) {
                          alert(`Image must be under ${MAX_PACKAGE_IMAGE_LABEL}`);
                          return;
                        }
                        setNewImageFile(file);
                        setNewImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>

                  {newImagePreview && (
                    <div className="mt-3">
                      <Image
                        src={newImagePreview}
                        alt="Preview"
                        width={640}
                        height={480}
                        className="max-h-40 rounded border w-auto h-auto"
                      />
                    </div>
                  )}
                 

                  {/* Button */}
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={isUpdating || uploadingImage || (newStatus === (shipmentDetails?.progress_step || selectedShipment.progressStep))}
                    className="mt-6 w-full h-12 bg-black text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating || uploadingImage ? 'Updating...' : 'Update Shipment'}
                  </Button>

                  <Button
                    onClick={handleDeleteShipment}
                    disabled={isDeleting || isUpdating || uploadingImage}
                    className="mt-3 w-full h-12 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Shipment'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}