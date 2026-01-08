// app/dashboard/shipment/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/Card';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';

interface ShipmentDetail {
  id: string;
  tracking_number: string;
  sender_name: string;
  receiver_name: string;
  items_description: string;
  weight: number;
  package_quantity?: number | null;
  origin_location: string;
  destination: string;
  package_image_url?: string;
  status: string;
  progress_step: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, string | number | boolean | object>;
}

const STATUS_OPTIONS = [
  { value: 'created', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PROGRESS_STEP_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
];

export default function ShipmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [updatedStatus, setUpdatedStatus] = useState('');
  const [updatedProgressStep, setUpdatedProgressStep] = useState('');

  const shipmentId = params?.id as string;

  useEffect(() => {
    const fetchShipment = async () => {
      if (!shipmentId) return;

      try {
        setIsLoading(true);
        const { data, error: fetchError } = await supabase
          .from('shipments')
          .select('*')
          .eq('id', shipmentId)
          .single();

        if (fetchError) {
          setError('Failed to load shipment details');
          console.error(fetchError);
          return;
        }

        if (data) {
          setShipment(data);
          setUpdatedStatus(data.status);
          setUpdatedProgressStep(data.progress_step);
        }
      } catch (err) {
        console.error('Error loading shipment:', err);
        setError('An error occurred while loading shipment');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipment();
  }, [shipmentId, supabase]);

  const handleUpdateStatus = async () => {
    if (!shipment) return;

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');

      const { error: updateError } = await supabase
        .from('shipments')
        .update({
          status: updatedStatus,
          progress_step: updatedProgressStep,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shipment.id);

      if (updateError) {
        setError('Failed to update shipment status');
        console.error(updateError);
        return;
      }

      setSuccess('Shipment status updated successfully!');
      setShipment({
        ...shipment,
        status: updatedStatus,
        progress_step: updatedProgressStep,
      });

      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      setError('An error occurred while updating status');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDateTime = (dt: string) => {
    try {
      return new Date(dt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dt;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-[#94A3B8]">Loading shipment details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!shipment) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-[#EF4444] font-semibold mb-4">Shipment not found</p>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="px-4 py-2 text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea690c] rounded-md cursor-pointer"
          >
            Back to History
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B] mb-1">Shipment Details</h1>
            <p className="text-[#475569]">Tracking: {shipment.tracking_number}</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="px-4 py-2 text-sm font-medium text-[#64748B] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            Back to History
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Card className="bg-[#FEE2E2]">
            <div className="text-[#991B1B]">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        {success && (
          <Card className="bg-[#F0FDF4]">
            <div className="text-[#166534]">
              <p className="font-semibold">Success</p>
              <p className="text-sm">{success}</p>
            </div>
          </Card>
        )}

        {/* Shipment Information */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1E293B] mb-6">Shipment Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Tracking Number</p>
                <p className="text-sm font-semibold text-[#1E293B]">{shipment.tracking_number}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Sender Name</p>
                <p className="text-sm text-[#1E293B]">{shipment.sender_name}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Origin Location</p>
                <p className="text-sm text-[#1E293B]">{shipment.origin_location}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Weight</p>
                <p className="text-sm text-[#1E293B]">{shipment.weight} kg</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Package Quantity</p>
                <p className="text-sm text-[#1E293B]">{shipment.package_quantity ?? '—'}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Created At</p>
                <p className="text-sm text-[#1E293B]">{formatDateTime(shipment.created_at)}</p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Receiver Name</p>
                <p className="text-sm text-[#1E293B]">{shipment.receiver_name}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Destination</p>
                <p className="text-sm text-[#1E293B]">{shipment.destination}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Items Description</p>
                <p className="text-sm text-[#1E293B]">{shipment.items_description}</p>
              </div>

              <div>
                <p className="text-xs text-[#94A3B8] mb-1">Updated At</p>
                <p className="text-sm text-[#1E293B]">{formatDateTime(shipment.updated_at)}</p>
              </div>
            </div>
          </div>

          {/* Package Image */}
          {shipment.package_image_url && (
            <div className="mt-8 pt-8 border-t border-[#E2E8F0]">
              <p className="text-xs text-[#94A3B8] mb-3">Package Image</p>
              <div className="relative h-64 w-full bg-[#F8FAFC] rounded-lg overflow-hidden">
                <Image
                  src={shipment.package_image_url}
                  alt="Package"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </Card>

        {/* Status Update Section */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1E293B] mb-6">Update Status</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-[#475569] font-medium mb-2 block">Shipment Status</label>
              <select
                value={updatedStatus}
                onChange={(e) => setUpdatedStatus(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[#475569] font-medium mb-2 block">Progress Step</label>
              <select
                value={updatedProgressStep}
                onChange={(e) => setUpdatedProgressStep(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {PROGRESS_STEP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleUpdateStatus}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-medium text-white bg-[#F97316] hover:bg-[#ea690c] disabled:opacity-50 rounded-md transition-colors cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setUpdatedStatus(shipment.status);
                setUpdatedProgressStep(shipment.progress_step);
              }}
              className="px-6 py-2.5 text-sm font-medium text-[#64748B] border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-md transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
