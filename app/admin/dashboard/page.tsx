// // app/admin/dashboard/page.tsx
// // Admin Dashboard - app/page-path: /admin/dashboard



'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/Card';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Box, Truck, Users, Crown, Filter, X, Package, ChevronDown } from 'lucide-react';

interface ShipmentRow {
  id: string;
  tracking_number?: string;
  trackingNumber?: string;
  destination?: string;
  delivery_location?: string;
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
}

interface NormalizedShipment {
  id: string;
  trackingNumber: string;
  status: string;
  progressStep: string;
  senderName: string;
  description: string;
  destination: string;
  createdAt: string;
}

interface DashboardStats {
  totalShipments: number;
  activeShipments: number;
  totalUsers: number;
  adminUsers: number;
  recentShipments: ShipmentRow[];
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
  origin_location: string | null;
  destination: string | null;
  package_image_url: string | null;
  status: string;
  tracking_number: string | null;
  progress_step: string;
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
  
  // Modal state
  const [selectedShipment, setSelectedShipment] = useState<NormalizedShipment | null>(null);
  const [shipmentDetails, setShipmentDetails] = useState<ShipmentDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newWaybill, setNewWaybill] = useState('');
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  // Reusable fetch function for shipments
  const fetchShipments = useCallback(async (showLoading = true) => {
    if (showLoading) setShipmentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/shipments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        const rawList: ShipmentRow[] = data?.shipments || data || [];
        const list: NormalizedShipment[] = rawList.map(normalize);
        setShipments(list);
      } else {
        setShipments([]);
      }
    } catch (e) {
      console.error('Failed to fetch admin shipments:', e);
      setShipments([]);
    } finally {
      if (showLoading) setShipmentsLoading(false);
    }
  }, [search, statusFilter]);

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
      destination: (row.destination || row.delivery_location || '').toString(),
      description: (row.items_description || row.itemsDescription || row.description || '').toString(),
      status: status,
      progressStep: displayStatus,
      senderName: (row.senderName || row.sender_name || '').toString(),
      createdAt: (row.createdAt || row.created_at || row.latest_event_time || '').toString(),
    };
  };

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
    setSelectedShipment(shipment);
    setNewStatus(shipment.progressStep);
    setNewWaybill(shipment.trackingNumber);
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
        // Use progress_step for the dropdown (fallback to status-based mapping)
        const progressStep = data.progress_step || 
          (data.status === 'created' ? 'pending' : 
           data.status === 'delivered' ? 'delivered' : 
           data.status === 'in_transit' ? 'in_transit' : 'pending');
        setNewStatus(progressStep);
        setNewWaybill(data.tracking_number || shipment.trackingNumber);
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
    setNewWaybill('');
    setNewImageFile(null);
    setNewImagePreview('');
    setUploadingImage(false);
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

      const res = await fetch(`/api/admin/shipments/${selectedShipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus, 
          location: newLocation,
          waybillNumber: newWaybill,
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
                  trackingNumber: newWaybill || s.trackingNumber,
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
      </div>

      {/* Shipment Management */}
      <Card id="shipments">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#1E293B]">Shipment Management</h2>
            <p className="text-sm text-[#94A3B8]">Search and manage recent shipments</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-[#E6EEF5] bg-white text-sm shadow-sm cursor-pointer">
              
              </button>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                id="admin-search"
                type="text"
                placeholder="Search by Waybill Number, address, or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="w-48">
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

        {/* Table */}
        <div className="overflow-hidden rounded-md border border-[#EEF2F6]">
          <div className="bg-[#EFEFEF] text-gray-950 grid grid-cols-6 gap-4 items-center px-6 py-4 text-sm font-medium">
            <div>Waybill Number</div>
            <div>Destination</div>
            <div>Description</div>
            <div>Status</div>
            <div className="text-right">Date/Time</div>
            <div className="text-right">Action</div>
          </div>

          <div className="divide-y divide-gray-100 bg-white">
            {shipmentsLoading ? (
              <div className="p-8 text-center text-[#94A3B8]">Loading shipments...</div>
            ) : shipments.length > 0 ? (
              shipments.map((shipment) => (
                <div key={shipment.id} className="grid grid-cols-6 gap-4 items-center px-6 py-6">
                  <div className="text-sm font-semibold text-[#0F2940]">
                    {shipment.trackingNumber}
                  </div>
                  <div className="text-sm text-[#475569]">
                    {shipment.destination || '—'}
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
                  <div className="text-right text-sm text-[#94A3B8]">
                    {formatDate(shipment.createdAt)}
                  </div>
                  <div className="text-right">
                    <Button
                      variant="secondary"
                      onClick={() => openModal(shipment)}
                      className="px-2 ml-34 py-2 bg-black text-white hover:bg-[#29292a]"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#94A3B8]">No shipments found</div>
            )}
          </div>
        </div>
      </Card>

      {/* Shipment Details Modal */}
      {isModalOpen && selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-6xl mx-4 p-6">
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
                      <p className="text-gray-500">Created At</p>
                      <p className="font-medium">
                        {shipmentDetails?.created_at ? formatDate(shipmentDetails.created_at) : formatDate(selectedShipment.createdAt)}
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

                  {/* Waybill Number */}
                  <label className="text-sm mb-1 text-gray-600">Waybill Number</label>
                  <Input
                    placeholder="e.g. WAY-001"
                    value={newWaybill}
                    onChange={(e) => setNewWaybill(e.target.value)}
                    className="mb-4"
                  />

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

                  {/* Location */}
                  <label className="text-sm mb-1 text-gray-600">Location</label>
                  <Input
                    placeholder="Enter current location"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="mb-4"
                  />

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
                        if (file.size > 1024 * 1024) { // 1MB limit
                          alert('Image must be under 1MB');
                          return;
                        }
                        setNewImageFile(file);
                        setNewImagePreview(URL.createObjectURL(file));
                      }}
                    />
                  </label>

                  {newImagePreview && (
                    <div className="mt-3">
                      <img
                        src={newImagePreview}
                        alt="Preview"
                        className="max-h-40 rounded border"
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}