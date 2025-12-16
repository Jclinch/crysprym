// app/dashboard/details/[id]/page.tsx
// Shipment Details Page - app/page-path: /dashboard/details/[id]

'use client';

import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import Link from 'next/link';

interface TrackingEvent {
  eventType: string;
  description: string;
  status: string;
  eventTimestamp: string;
}

interface ShipmentDetail {
  id: string;
  trackingNumber: string;
  status: string;
  shipmentType: string;
  weightKg: number;
  pickupLocation: string;
  pickupAddress: string;
  pickupCity: string;
  pickupPostalCode: string;
  deliveryLocation: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  contentsDescription: string;
  insuranceRequired: boolean;
  insuranceAmount: number;
  signatureRequired: boolean;
  specialHandling: string;
  referenceNumber: string;
  specialInstructions: string;
  estimatedDeliveryDate: string;
  createdAt: string;
  events: TrackingEvent[];
}

import { use } from 'react';

export default function ShipmentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchShipment = async () => {
      try {
        const response = await fetch(`/api/shipments/${id}`);
        if (!response.ok) {
          setError('Shipment not found');
          setIsLoading(false);
          return;
        }
        const data = await response.json();
        setShipment(data);
      } catch {
        setError('Failed to fetch shipment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchShipment();
  }, [id]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'success';
      case 'in_transit':
        return 'default';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-[#94A3B8]">Loading shipment details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !shipment) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl">
          <Card className="bg-[#FEE2E2]">
            <div className="text-[#991B1B]">
              <p className="font-semibold mb-2">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
          <div className="mt-6">
            <Link href="/dashboard/history">
              <Button variant="secondary">Back to History</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B] mb-2">Shipment Details</h1>
            <p className="text-[#475569]">Tracking: {shipment.trackingNumber}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="medium">
              Print
            </Button>
            <Button variant="secondary" size="medium">
              Download PDF
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          <Badge variant={getStatusBadgeVariant(shipment.status)}>
            {getStatusLabel(shipment.status)}
          </Badge>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <p className="text-xs text-[#94A3B8] mb-2">Status</p>
            <p className="font-semibold text-[#1E293B]">{getStatusLabel(shipment.status)}</p>
          </Card>
          <Card>
            <p className="text-xs text-[#94A3B8] mb-2">Tracking Number</p>
            <div className="flex items-center gap-2">
              <p className="font-mono font-semibold text-[#1E293B]">{shipment.trackingNumber}</p>
              <button
                onClick={() => copyToClipboard(shipment.trackingNumber)}
                className="text-[#2563EB] hover:text-[#1D4ED8] cursor-pointer"
              >
                📋
              </button>
            </div>
          </Card>
          <Card>
            <p className="text-xs text-[#94A3B8] mb-2">Est. Delivery</p>
            <p className="font-semibold text-[#1E293B]">{formatDate(shipment.estimatedDeliveryDate)}</p>
          </Card>
        </div>

        {/* Shipment Information */}
        <Card>
          <h2 className="text-lg font-semibold text-[#1E293B] mb-4 pb-4 border-b border-[#E2E8F0]">
            Shipment Information
          </h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm font-semibold text-[#1E293B] mb-3">From</p>
              <div className="space-y-1 text-sm">
                <p className="text-[#1E293B]">{shipment.pickupLocation}</p>
                <p className="text-[#475569]">{shipment.pickupAddress}</p>
                <p className="text-[#475569]">{shipment.pickupCity}, {shipment.pickupPostalCode}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1E293B] mb-3">To</p>
              <div className="space-y-1 text-sm">
                <p className="text-[#1E293B]">{shipment.deliveryLocation}</p>
                <p className="text-[#475569]">{shipment.deliveryAddress}</p>
                <p className="text-[#475569]">{shipment.deliveryCity}, {shipment.deliveryPostalCode}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Package Details */}
        <Card>
          <h2 className="text-lg font-semibold text-[#1E293B] mb-4 pb-4 border-b border-[#E2E8F0]">
            Package Details
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Weight</span>
              <span className="text-[#1E293B] font-medium">{shipment.weightKg} kg</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Dimensions</span>
              <span className="text-[#1E293B] font-medium">
                {shipment.lengthCm}cm × {shipment.widthCm}cm × {shipment.heightCm}cm
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Contents</span>
              <span className="text-[#1E293B] font-medium">{shipment.contentsDescription || 'N/A'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Shipment Type</span>
              <span className="text-[#1E293B] font-medium capitalize">{shipment.shipmentType}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Insurance</span>
              <span className="text-[#1E293B] font-medium">
                {shipment.insuranceRequired ? `Yes - $${shipment.insuranceAmount}` : 'No'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
              <span className="text-[#94A3B8]">Signature Required</span>
              <span className="text-[#1E293B] font-medium">{shipment.signatureRequired ? 'Yes' : 'No'}</span>
            </div>
            {shipment.specialHandling && (
              <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Special Handling</span>
                <span className="text-[#1E293B] font-medium capitalize">{shipment.specialHandling}</span>
              </div>
            )}
            {shipment.referenceNumber && (
              <div className="flex justify-between py-2 border-b border-[#E2E8F0]">
                <span className="text-[#94A3B8]">Reference Number</span>
                <span className="text-[#1E293B] font-medium">{shipment.referenceNumber}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Tracking Timeline */}
        <Card>
          <h2 className="text-lg font-semibold text-[#1E293B] mb-6">Tracking Timeline</h2>
          <div className="space-y-0">
            {shipment.events && shipment.events.length > 0 ? (
              shipment.events.map((event, index) => {
                const isCompleted = event.status === 'completed';
                const isLast = index === shipment.events.length - 1;

                return (
                  <div key={index} className="relative">
                    {!isLast && (
                      <div
                        className={`absolute left-6 top-12 w-1 h-8 ${
                          isCompleted ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'
                        }`}
                      ></div>
                    )}
                    <div className="flex gap-6 pb-6">
                      <div className="relative flex flex-col items-center">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            isCompleted
                              ? 'bg-[#10B981] border-[#10B981]'
                              : 'bg-white border-[#E2E8F0]'
                          }`}
                        >
                          {isCompleted && <span className="text-white text-xs">✓</span>}
                        </div>
                      </div>
                      <div className="flex-1 pt-0.5">
                        <p
                          className={`font-medium ${
                            isCompleted ? 'text-[#1E293B]' : 'text-[#94A3B8]'
                          }`}
                        >
                          {event.eventType
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ')}
                        </p>
                        <p className="text-sm text-[#475569] mt-1">{event.description}</p>
                        <p className="text-xs text-[#94A3B8] mt-2">
                          {formatDateTime(event.eventTimestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[#94A3B8]">No tracking events yet</p>
            )}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/history">
            <Button variant="secondary">Back to History</Button>
          </Link>
          <Link href="/dashboard/new-shipment">
            <Button variant="primary">Create New Shipment</Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
