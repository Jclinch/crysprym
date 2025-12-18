// // app/dashboard/tracking/page.tsx
// // Live Tracking Page - app/page-path: /dashboard/tracking

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card } from '@/components/Card';
// import { Button } from '@/components/Button';
// import { Input } from '@/components/Input';
import Image from 'next/image';
import { Tabs } from '@/components/Sidebar';

type EventRow = {
  id: string;
  eventType: string;
  description?: string | null;
  location?: string | null;
  eventTimestamp: string;
};

type TrackingResponse = {
  shipment: {
    id: string;
    trackingNumber: string;
    senderName?: string;
    receiverName?: string;
    originLocation?: string;
    destination?: string;
    weight?: number;
    itemsDescription?: string;
    package_image_url?: string; // snake_case from DB
    packageImageUrl?: string;   // camelCase from API response
    status?: string;
    progressStep?: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered';
    progressIndex?: number; // 0..3
    createdAt?: string;
    updatedAt?: string;
  };
  estimatedDeliveryDate?: string;
  events: EventRow[];
};

const STEP_LABELS = ['Pending', 'In Transit', 'Out for Delivery', 'Delivered'];

export default function TrackingPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [data, setData] = useState<TrackingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearched(true);

    if (!trackingNumber.trim()) {
      setError('Please enter a tracking number');
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(trackingNumber.trim())}`);
      if (!res.ok) {
        setError('Shipment not found');
        setData(null);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch tracking information');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const progressIndex = data?.shipment?.progressIndex ?? -1;
  const rawImageUrl = data?.shipment?.packageImageUrl || data?.shipment?.package_image_url || '';
  const versionTag = data?.shipment?.updatedAt || data?.shipment?.createdAt || '';
  const imageUrl = rawImageUrl
    ? `${rawImageUrl}${rawImageUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(versionTag)}`
    : '';

return (
  <DashboardLayout>
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="max-w-full mx-auto"
    >
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  <Tabs />

        <div className="p-8">
                  <div className="w-full max-w-[1100px] mx-auto space-y-8 px-4">
        {/* Title */}
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] mb-1">Live Tracking</h1>
          <p className="text-[#64748B]">Track your shipment in real-time</p>
        </div>

        {/* Search card */}
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <div className="bg-transparent">
              <form onSubmit={handleSearch} className="flex gap-4 items-center">
                <div className="flex-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-[#94A3B8]">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M5 11a6 6 0 1012 0 6 6 0 00-12 0z" />
                      </svg>
                    </span>
                    <input
                      className="w-full pl-11 pr-4 h-11 text-sm border border-[#E6E7EB] rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
                      placeholder="BR-251212-984470"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="w-[140px] h-11 rounded-md bg-[#2c2b2a] hover:bg-[#4b4a48] text-white font-medium shadow cursor-pointer"
                  type="submit"
                >
                  {loading ? 'Tracking...' : 'Track'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* If not searched: show hint card */}
        {!searched && (
          <Card>
            <div className="py-10 text-center text-[#94A3B8]">
              <p className="mb-1">Enter a Waybill number to view real-time shipment status</p>
              <p className="text-xs">Format: BR-251212-984470</p>
            </div>
          </Card>
        )}

        {/* Error */}
        {searched && !data && error && (
          <Card className="bg-[#FEE2E2]">
            <div className="p-4 text-[#991B1B]">
              <p className="font-semibold">Shipment not found</p>
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        {/* Shipment Details + Progress */}
        {data && data.shipment && (
          <div className="bg-white rounded-[18px] border border-[#E6E7EB] shadow-sm overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-semibold text-[#1E293B] mb-6">Shipment Details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Senders Name</p>
                    <p className="text-sm text-[#1E293B] font-medium">{data.shipment.senderName || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Waybill Number</p>
                    <p className="text-sm text-[#1E293B] font-medium">{data.shipment.trackingNumber}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Origin Location</p>
                    <p className="text-sm text-[#1E293B]">{data.shipment.originLocation}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Weight</p>
                    <p className="text-sm text-[#1E293B]">{data.shipment.weight ?? '—'}kg</p>
                  </div>
                </div>

                {/* Right column */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Receivers Name</p>
                    <p className="text-sm text-[#1E293B] font-medium">{data.shipment.receiverName || '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Current Status</p>
                    <p className="text-sm text-[#1E293B] font-medium">{data.shipment.status || data.shipment.progressStep}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Destination</p>
                    <p className="text-sm text-[#1E293B]">{data.shipment.destination}</p>
                  </div>

                  <div>
                    <p className="text-xs text-[#94A3B8] mb-1">Description</p>
                    <p className="text-sm text-[#1E293B]">{data.shipment.itemsDescription || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Progress area */}
              <div className="mt-10">
                <h3 className="text-lg font-semibold text-[#1E293B] mb-6">Delivery Progress</h3>

                {/* horizontal progress bar */}
                <div className="relative px-6 pb-6">
                  {/* Background line */}
                  <div className="absolute left-6 right-6 top-8 h-1.5 bg-[#E6E7EB] rounded-full"></div>
                  
                  {/* Filled progress line */}
                  {progressIndex >= 0 && (
                    <div 
                      className="absolute left-6 top-8 h-1.5 bg-[#34D399] rounded-full transition-all duration-500"
                      style={{
                        width: `calc(${(progressIndex / (STEP_LABELS.length - 1)) * 100}% + 22px - ${progressIndex === 0 ? '0px' : '22px'})`,
                      }}
                    ></div>
                  )}

                  <div className="relative flex items-center justify-between">
                    {STEP_LABELS.map((label, idx) => {
                      const completed = idx <= progressIndex;
                      const active = idx === progressIndex;
                      const circleSize = active ? 56 : 44;

                      return (
                        <div key={label} className="flex-1 flex flex-col items-center">
                          <div
                            className={`rounded-full flex items-center justify-center ${completed ? 'border-transparent' : 'border-[#E6E7EB]'}`}
                            style={{
                              width: circleSize,
                              height: circleSize,
                              boxShadow: active ? '0 6px 18px rgba(52,211,153,0.12)' : undefined,
                              background: completed ? '#34D399' : '#FFFFFF',
                              border: completed ? 'none' : '2px solid #E6E7EB',
                            }}
                          >
                            {/* icon */}
                            <div className="text-white text-[18px] font-semibold">
                              {completed ? '✓' : idx + 1}
                            </div>
                          </div>

                          <div className={`mt-3 text-sm ${active ? 'text-[#16A34A]' : completed ? 'text-[#34D399]' : 'text-[#94A3B8]'}`}>
                            {label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline + Latest Image */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Tracking Timeline</h2>
                {data.events && data.events.length > 0 ? (
                  <div className="space-y-4">
                    {data.events.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-4">
                        <div className="w-10">
                          <div className="w-8 h-8 rounded-full bg-[#E6E7EB] flex items-center justify-center text-[#475569]">✓</div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#1E293B]">
                            {ev.eventType.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-[#64748B]">{ev.description}</div>
                          <div className="text-xs text-[#94A3B8] mt-1">{new Date(ev.eventTimestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[#94A3B8] text-sm">No tracking events yet</div>
                )}
              </Card>
            </div>
            <div className="md:col-span-1">
              <Card>
                <h2 className="text-lg font-semibold text-[#1E293B] mb-4">Latest Image</h2>
                {imageUrl ? (
                  <div className="rounded-lg overflow-hidden border border-[#E6E7EB]">
                    <Image src={imageUrl} alt="Shipment" width={800} height={600} className="w-full h-auto" />
                  </div>
                ) : (
                  <div className="py-10 text-center text-[#94A3B8] text-sm">No image available</div>
                )}
              </Card>
            </div>
          </div>
        )}
          </div>
        </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
