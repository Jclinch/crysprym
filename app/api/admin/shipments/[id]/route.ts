// app/api/admin/shipments/[id]/route.ts
// Admin Shipment Update API - PATCH /api/admin/shipments/[id]

import { createClient } from '@/utils/supabase/server';
import { createClient as createSbAdmin } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(cookies());
    const { id } = await params;

    // Check if user is superadmin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData?.role !== 'superadmin') {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const {
      status: progressStep,
      location,
      waybillNumber,
      packageImageBucket,
      packageImagePath,
      packageImageUrl,
      receiverName,
      weight,
    } = await request.json();

    if (!progressStep) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Valid progress_step values from shipment_progress_step enum
    const validProgressSteps = ['pending', 'in_transit', 'out_for_delivery', 'delivered'];
    if (!validProgressSteps.includes(progressStep)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Map progress_step to the corresponding shipment_status enum value
    // shipment_status enum: 'draft', 'created', 'confirmed', 'in_transit', 'delivered', 'cancelled', 'returned'
    const progressToStatusMap: Record<string, string> = {
      'pending': 'created',
      'in_transit': 'in_transit',
      'out_for_delivery': 'in_transit', // out_for_delivery is still "in transit" from status perspective
      'delivered': 'delivered',
    };
    const shipmentStatus = progressToStatusMap[progressStep] || 'created';

    // Build update object
    const updateData: Record<string, unknown> = { 
      status: shipmentStatus, 
      progress_step: progressStep,
      updated_at: new Date().toISOString() 
    };
    
    // Include destination if location is provided
    if (location && location.trim()) {
      updateData.destination = location.trim();
    }

    // Allow SuperAdmin to correct receiver name
    if (typeof receiverName === 'string') {
      const trimmed = receiverName.trim();
      if (trimmed) {
        updateData.receiver_name = trimmed;
      }
    }

    // Allow SuperAdmin to correct weight
    if (typeof weight === 'number') {
      if (!Number.isFinite(weight) || weight <= 0) {
        return NextResponse.json({ error: 'Invalid weight' }, { status: 400 });
      }
      updateData.weight = weight;
    }

    // Optionally override tracking number if explicitly provided
    if (typeof waybillNumber === 'string' && waybillNumber.trim()) {
      const normalized = waybillNumber
        .trim()
        .replace(/[\u2010-\u2015\u2212]/g, '-')
        .replace(/\s+/g, '')
        .toUpperCase();

      if (!/^CRY-\d{3}-\d{4}$/.test(normalized)) {
        return NextResponse.json(
          { error: 'Invalid waybill number format. Expected CRY-123-4567' },
          { status: 400 }
        );
      }

      updateData.tracking_number = normalized;
    }

    // Include image fields if provided
    if (packageImageBucket && packageImagePath && packageImageUrl) {
      updateData.package_image_bucket = packageImageBucket;
      updateData.package_image_path = packageImagePath;
      updateData.package_image_url = packageImageUrl;
    }

    // Use service role for updating any shipment (bypass RLS after admin check)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server misconfiguration: missing Supabase URL or Service Role Key' },
        { status: 500 }
      );
    }
    const supabaseAdmin = createSbAdmin(supabaseUrl, serviceRoleKey);

    // Update shipment
    const { error: updateError } = await supabaseAdmin
      .from('shipments')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating shipment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update shipment', details: updateError.message },
        { status: 500 }
      );
    }

    // Create shipment event for status change
    const eventDescription = location && location.trim() 
      ? `Status changed to ${progressStep.replace(/_/g, ' ')} - Location: ${location.trim()}`
      : `Status changed to ${progressStep.replace(/_/g, ' ')}`;
    
    const { error: eventError } = await supabaseAdmin
      .from('shipment_events')
      .insert({
        shipment_id: id,
        event_type: progressStep,
        description: eventDescription,
        location: location?.trim() || null,
        created_by: user.id,
      });

    if (eventError) {
      console.error('Error creating event:', eventError);
      // Don't fail the request if event creation fails
    }

    return NextResponse.json({ message: 'Shipment updated successfully' });
  } catch (error) {
    console.error('Admin shipment update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}