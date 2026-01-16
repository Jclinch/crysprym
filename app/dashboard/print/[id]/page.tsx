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
    <div className="min-h-screen bg-white text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A5; margin: 5mm; }
            @media print {
              .no-print { display: none !important; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `,
        }}
      />

      {/* Print Toolbar */}
      <div className="no-print flex items-center justify-between p-4 bg-white border-b">
        <Button variant="secondary" onClick={() => router.back()}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      {/* Watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <div className="relative w-[520px] h-[200px]">
          <Image
            src="/logo.png"
            alt=""
            fill
            className="object-contain opacity-[0.06]"
            priority
          />
        </div>
      </div>

      <div className="mx-auto max-w-[900px] p-8">
        <div className="bg-white p-8 shadow-sm">
          {/* Header Section */}
          <div className="grid grid-cols-[160px_1fr_260px] gap-6 items-center mb-8 pb-6 border-b-2 border-slate-200">
            <div className="bg-slate-900 p-5 flex items-center justify-center shadow-md">
              <Image src="/logo.png" alt="CRYSPRYM" width={140} height={48} priority />
            </div>

            <div className="flex flex-col justify-center pl-2">
              <div className="text-2xl font-extrabold text-slate-900 tracking-wider leading-tight">
                CRYSPRYM LOGISTICS
              </div>
              <div className="text-xs text-slate-500 mt-1 tracking-wide">
                SHIPPING & DELIVERY SERVICES
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative bg-gradient-to-br from-red-600 to-red-700 text-white px-5 py-3 text-center shadow-lg overflow-hidden border-2 border-red-800">
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.3) 10px, rgba(255,255,255,.3) 20px)'
                }}></div>
                <div className="relative">
                  <div className="text-2xl font-black tracking-wider">⚠ FRAGILE</div>
                  <div className="text-xs font-semibold mt-1 tracking-wide">HANDLE WITH EXTREME CARE</div>
                </div>
              </div>
              <div className="text-right text-sm bg-slate-50 px-3 py-2 rounded">
                <span className="font-semibold text-slate-700">Date:</span>
                <span className="ml-2 font-medium">{shipmentDate}</span>
              </div>
            </div>
          </div>

          {/* Priority Parcel Banner */}
          <div className="bg-slate-900 text-white px-6 py-3 mb-6 text-center shadow-md">
            <div className="text-2xl font-black tracking-widest">PRIORITY PARCEL</div>
          </div>

          {/* From/To Sections */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-300 p-5 bg-slate-50 shadow-sm">
              <div className="text-base font-bold mb-3 pb-2 border-b border-slate-400 text-slate-900">
                FROM: <span className="text-slate-700">{shipment.origin_location?.toUpperCase() || '—'}</span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Name:</span>
                  <span className="ml-2 text-slate-900">{shipment.sender_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Location:</span>
                  <span className="text-slate-900 mt-1 pl-2">{shipment.origin_location || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Phone:</span>
                  <span className="ml-2 text-slate-900">{senderPhone}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-300 p-5 bg-slate-50 shadow-sm">
              <div className="text-base font-bold mb-3 pb-2 border-b border-slate-400 text-slate-900">
                TO: <span className="text-slate-700">{shipment.destination?.toUpperCase() || '—'}</span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div>
                  <span className="font-semibold text-slate-700">Name:</span>
                  <span className="ml-2 text-slate-900">{shipment.receiver_name || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Location:</span>
                  <span className="text-slate-900 mt-1 pl-2">{shipment.destination || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Phone:</span>
                  <span className="ml-2 text-slate-900">{receiverPhone}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tracking ID and Additional Info */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div className="border border-slate-300 p-5 bg-blue-50 shadow-sm">
              <div className="text-sm font-bold mb-2 text-slate-700 uppercase tracking-wide">
                Tracking ID
              </div>
              <div className="text-3xl font-black text-slate-900 tracking-wide break-all">
                {shipment.tracking_number || '—'}
              </div>
            </div>

            <div className="border border-slate-300 p-5 bg-amber-50 shadow-sm">
              <div className="text-sm font-bold mb-2 text-slate-700 uppercase tracking-wide">
                Additional Information
              </div>
              <div className="text-sm mb-2 text-slate-900">
                {shipment.items_description || '—'}
              </div>
              <div className="text-sm mt-3 pt-3 border-t border-amber-200">
                <span className="font-semibold text-slate-700">Weight:</span>
                <span className="ml-2 text-lg font-bold text-slate-900">{shipment.weight ?? '—'} KG</span>
              </div>
              <div className="text-sm mt-3 pt-3 border-t border-amber-200">
                <span className="font-semibold text-slate-700">Package Quantity:</span>
                <span className="ml-2 text-lg font-bold text-slate-900">{shipment.package_quantity ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 text-center space-y-1">
            <p className="font-semibold">Handle with care • Confirm receiver identity before release</p>
          </div>
        </div>
      </div>
    </div>
  );
}