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
  origin_location: string | null;
  destination: string | null;
  shipment_date?: string | null;
  created_at: string | null;
};

function isUuid(value?: string | null) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatDateOnly(value?: string | null) {
  if (!value) return '—';
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
          'id, tracking_number, sender_name, sender_contact, receiver_name, receiver_contact, items_description, weight, origin_location, destination, shipment_date, created_at'
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
  const shipmentDate = formatDateOnly(shipment.shipment_date || shipment.created_at);

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 14mm;
          }
          body {
            background: #ffffff !important;
          }
        }
      `}</style>

      <div className="max-w-[900px] mx-auto p-6 print:p-0">
        {/* Actions */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <Button variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => window.print()}>
              Print
            </Button>
          </div>
        </div>

        {/* Document */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none relative overflow-hidden">
          {/* Watermark */}
          <Image
            src="/logo.png"
            alt=""
            aria-hidden="true"
            width={520}
            height={520}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[90%] h-auto opacity-[0.06] pointer-events-none select-none"
          />

          <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logo.png" alt="Company Logo" width={64} height={64} priority />
              <div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight">CRYSPRYM Logistics</h1>
                <p className="text-sm text-slate-600">Shipment Document</p>
                <div className="mt-2">
                  <p className="text-xs text-slate-500">Waybill ID</p>
                  <p className="font-mono font-black text-3xl md:text-4xl tracking-wider text-slate-900">
                    {shipment.tracking_number || '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center rounded-md border border-red-300 bg-red-50 px-3 py-1">
                <span className="text-2xl font-extrabold text-red-700 tracking-widest">FRAGILE</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Handle with care</p>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">From (Origin)</h2>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                <p><span className="text-slate-500">Location:</span> {shipment.origin_location || '—'}</p>
                <p><span className="text-slate-500">Sender:</span> {shipment.sender_name || '—'}</p>
                <p><span className="text-slate-500">Phone:</span> {senderPhone}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <h2 className="text-sm font-semibold text-slate-900">To (Destination)</h2>
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                <p><span className="text-slate-500">Location:</span> {shipment.destination || '—'}</p>
                <p><span className="text-slate-500">Receiver:</span> {shipment.receiver_name || '—'}</p>
                <p><span className="text-slate-500">Phone:</span> {receiverPhone}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-4 md:col-span-2">
              <h2 className="text-sm font-semibold text-slate-900">Shipment Details</h2>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-700">
                <div>
                  <p className="text-slate-500">Shipment Date</p>
                  <p className="font-medium text-slate-900">{shipmentDate}</p>
                </div>
                <div>
                  <p className="text-slate-500">Weight</p>
                  <p className="font-medium text-slate-900">{shipment.weight ?? '—'}{shipment.weight != null ? ' kg' : ''}</p>
                </div>
                <div>
                  <p className="text-slate-500">Shipment ID</p>
                  <p className="font-mono text-xs text-slate-900 break-all">{shipment.id}</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-slate-500 text-sm">Items Description</p>
                <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{shipment.items_description || '—'}</p>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-6 mt-2">
                <div>
                  <p className="text-xs text-slate-500">Sender Signature</p>
                  <div className="mt-10 border-b border-slate-300" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Receiver Signature</p>
                  <div className="mt-10 border-b border-slate-300" />
                </div>
              </div>
              <p className="mt-6 text-[11px] text-slate-500">
                This document is generated by the system. Please verify shipment details before dispatch.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
