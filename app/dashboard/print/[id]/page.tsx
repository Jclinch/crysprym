'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/Button';

type Contact = {
  phone?: string;
  email?: string;
} | null;

type Shipment = {
  id: string;
  tracking_number: string | null;
  sender_name: string | null;
  sender_contact: Contact;
  receiver_name: string | null;
  receiver_contact: Contact;
  items_description: string | null;
  weight: number | null;
  package_quantity: number | null;
  origin_location: string | null;
  destination: string | null;
  shipment_date?: string | null;
  created_at: string | null;
};

function isUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');
}

export default function PrintShipmentPage() {
  const router = useRouter();
  const params = useParams();
  const shipmentId = useMemo(() => {
    const raw = (params as { id?: string | string[] })?.id;
    if (Array.isArray(raw)) return raw[0];
    return raw;
  }, [params]);
  const supabase = useMemo(() => createClient(), []);

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchShipment = async () => {
      setIsLoading(true);
      setError(null);

      if (!shipmentId) {
        if (!mounted) return;
        setError('Missing shipment id.');
        setIsLoading(false);
        return;
      }

      if (!isUuid(shipmentId)) {
        if (!mounted) return;
        setError('Invalid shipment id.');
        setIsLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!mounted) return;
        setError('You must be signed in to print shipments.');
        setIsLoading(false);
        return;
      }

      const { data, error: shipmentError } = await supabase
        .from('shipments')
        .select(
          'id, tracking_number, sender_name, sender_contact, receiver_name, receiver_contact, items_description, weight, package_quantity, origin_location, destination, shipment_date, created_at'
        )
        .eq('id', shipmentId)
        .single();

      if (!mounted) return;

      if (shipmentError) {
        setError(shipmentError.message || 'Failed to load shipment.');
        setShipment(null);
        setIsLoading(false);
        return;
      }

      setShipment((data as Shipment) || null);
      setIsLoading(false);
    };

    fetchShipment();
    return () => {
      mounted = false;
    };
  }, [shipmentId, supabase]);

  useEffect(() => {
    if (!shipment) return;
    const t = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(t);
  }, [shipment]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-sm text-slate-500">Loading printable document…</p>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="min-h-screen bg-white px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-semibold text-slate-900">Unable to print</h1>
          <p className="mt-2 text-sm text-slate-600">{error || 'Shipment not found.'}</p>
          <div className="mt-6 flex gap-3 print:hidden">
            <Button variant="secondary" onClick={() => router.back()}>
              Go Back
            </Button>
            <Link href="/dashboard/history">
              <Button variant="primary">History</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const receiverPhone = shipment.receiver_contact?.phone || '—';
  const senderPhone = shipment.sender_contact?.phone || '—';
  const shipmentDate = formatDate(shipment.shipment_date || shipment.created_at);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { 
              size: A5; 
              margin: 5mm;
            }
            @media print {
              .no-print { display: none !important; }
              body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                background: white !important;
              }
              .print-bg-white { background: white !important; }
            }
          `,
        }}
      />

      {/* Print Toolbar */}
      <div className="no-print flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <Button variant="secondary" onClick={() => router.back()}>
          ← Back
        </Button>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => window.print()}>
            🖨️ Print Document
          </Button>
        </div>
      </div>

      {/* Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="relative w-[500px] h-[180px]">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain opacity-[0.04]"
            priority
          />
        </div>
      </div>

      <div className="mx-auto max-w-[820px] p-6">
        <div className="print-bg-white bg-white p-8 rounded-xl border border-slate-200">
          
          {/* Header with diagonal accent */}
          <div className="relative mb-8 pb-6 border-b border-slate-200">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex items-center gap-6">
              {/* Logo with modern card */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl blur opacity-20"></div>
                <div className="relative bg-slate-900 p-5 rounded-xl">
                  <Image src="/logo.png" alt="CRYSPRYM" width={120} height={40} priority />
                </div>
              </div>

              {/* Company Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  CRYSPRYM <span className="text-blue-600">LOGISTICS</span>
                </h1>
                <p className="text-sm text-slate-500 mt-1 tracking-wide font-medium">
                  EXPRESS SHIPPING & LOGISTICS SERVICES
                </p>
                <div className="mt-3 text-xs text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    Worldwide Delivery
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Track & Trace
                  </span>
                </div>
              </div>

              {/* Date and Warning Badge */}
              <div className="flex flex-col items-end gap-3">
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg blur opacity-20"></div>
                  <div className="relative bg-gradient-to-br from-red-600 to-orange-600 text-white px-5 py-3 rounded-lg border border-red-700">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-lg font-black tracking-wider">FRAGILE</span>
                    </div>
                    <p className="text-xs font-semibold mt-1 tracking-wide opacity-90">HANDLE WITH CARE</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-medium">Document Date</p>
                  <p className="text-sm font-bold text-slate-800">{shipmentDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Banner */}
          <div className="relative mb-8 overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-90"></div>
            <div className="relative px-8 py-5 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-white/90 font-medium mb-1 tracking-wide uppercase">TRACKING ID</p>
                <p className="text-4xl font-black text-white tracking-wider leading-none">{shipment.tracking_number || '—'}</p>
              </div>
            </div>
          </div>

          {/* From/To Cards */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* From Card */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-xl blur opacity-20"></div>
              <div className="relative bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">ORIGIN</h3>
                    <p className="text-sm text-blue-600 font-medium">{shipment.origin_location?.toUpperCase() || 'NOT SPECIFIED'}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-slate-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Sender Name</p>
                      <p className="font-medium text-slate-800">{shipment.sender_name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-slate-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Contact Phone</p>
                      <p className="font-medium text-slate-800">{senderPhone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* To Card */}
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl blur opacity-20"></div>
              <div className="relative bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">DESTINATION</h3>
                    <p className="text-sm text-green-600 font-medium">{shipment.destination?.toUpperCase() || 'NOT SPECIFIED'}</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-slate-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Receiver Name</p>
                      <p className="font-medium text-slate-800">{shipment.receiver_name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-slate-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Contact Phone</p>
                      <p className="font-medium text-slate-800">{receiverPhone}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Details Grid */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              SHIPMENT DETAILS
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1">WEIGHT</p>
                <p className="text-2xl font-black text-slate-900">
                  {shipment.weight ?? '—'}<span className="text-sm font-normal text-slate-500"> kg</span>
                </p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1">PACKAGES</p>
                <p className="text-2xl font-black text-slate-900">{shipment.package_quantity ?? '—'}</p>
              </div>
              
              <div className="text-center p-4 bg-white rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-medium mb-1">DATE</p>
                <p className="text-lg font-bold text-slate-900">{shipmentDate}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-sm text-slate-600 font-medium mb-2">ITEMS DESCRIPTION</p>
              <div className="bg-white p-4 rounded-lg border border-slate-100">
                <p className="text-sm text-slate-800 leading-relaxed">{shipment.items_description || 'No description provided'}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div>
                <p className="font-medium text-slate-700">CRYSPRYM LOGISTICS</p>
                <p>Secure • Fast • Reliable Delivery Services</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 font-medium">
                🚚 This is an official shipment document. Please handle with care and verify all details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}