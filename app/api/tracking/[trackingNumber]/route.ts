// app/api/tracking/[trackingNumber]/route.ts
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  description: string | null;
  location: string | null;
  event_time: string;
  created_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const { trackingNumber: rawTrackingNumber } = await params;
    const supabase = createClient(cookies());
    const trackingNumber = rawTrackingNumber?.trim() || '';

    if (!trackingNumber) {
      console.error('No Waybill number provided');
      return NextResponse.json(
        { error: 'Waybill number is required' },
        { status: 400 }
      );
    }

    console.log('Searching for shipment with Waybill number:', trackingNumber);

    // Query using the view for optimized data retrieval (exact match on assigned waybill)
    const { data: shipment, error: shipmentError } = await supabase
      .from('v_shipments_with_latest_event')
      .select('*')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (shipmentError) {
      console.error('Shipment query error:', shipmentError);
      return NextResponse.json(
        { error: 'Shipment not found', details: shipmentError.message },
        { status: 404 }
      );
    }

    if (!shipment) {
      console.warn('No shipment found for tracking number:', trackingNumber);
      
      // Debug: check if tracking_number column has any non-null values
      const { data: allShipments } = await supabase
        .from('v_shipments_with_latest_event')
        .select('id, tracking_number')
        .not('tracking_number', 'is', null)
        .limit(5);
      
      console.log('Sample tracking numbers in DB:', allShipments);
      
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      );
    }

    console.log('Found shipment:', {
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      sender_name: shipment.sender_name,
      receiver_name: shipment.receiver_name,
      progress_step: shipment.progress_step,
    });

    // Get shipment events
    const { data: events, error: eventsError } = await supabase
      .from('shipment_events')
      .select('*')
      .eq('shipment_id', shipment.id)
      .order('event_time', { ascending: false });

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      return NextResponse.json(
        { error: 'Failed to fetch tracking events' },
        { status: 500 }
      );
    }

    // Calculate estimated delivery date (5 days from creation)
    const createdDate = new Date(shipment.created_at);
    const estimatedDate = new Date(createdDate);
    estimatedDate.setDate(estimatedDate.getDate() + 5);

    // Transform events for response
    const transformedEvents = (events || []).map((event: ShipmentEvent) => ({
      id: event.id,
      eventType: event.event_type,
      description: event.description || 'Shipment update',
      location: event.location,
      eventTimestamp: event.event_time,
    }));

    // Get shipment type from metadata or default to standard
    const shipmentType = shipment.metadata?.shipmentType || 'standard';

    // Map shipment status to progressIndex (0-3)
    // Status values: 'draft', 'created', 'confirmed', 'in_transit', 'delivered', 'cancelled', 'returned'
    const statusToProgressMap: Record<string, number> = {
      'draft': 0,
      'created': 0,
      'confirmed': 0,
      'in_transit': 1,
      'delivered': 3,
      'cancelled': 0,
      'returned': 0,
    };
    const progressIndex = statusToProgressMap[shipment.status] ?? 0;
    
    // Derive progress step label from status
    const statusToProgressStepMap: Record<string, string> = {
      'draft': 'pending',
      'created': 'pending',
      'confirmed': 'pending',
      'in_transit': 'in_transit',
      'delivered': 'delivered',
      'cancelled': 'pending',
      'returned': 'pending',
    };
    const progressStep = statusToProgressStepMap[shipment.status] ?? 'pending';

    return NextResponse.json({
      shipment: {
        id: shipment.id,
        trackingNumber: shipment.tracking_number,
        senderName: shipment.sender_name,
        receiverName: shipment.receiver_name,
        originLocation: shipment.origin_location || 'Not specified',
        destination: shipment.destination || 'Not specified',
        itemsDescription: shipment.items_description,
        weight: shipment.weight ? parseFloat(String(shipment.weight)) : null,
        packageImageUrl: shipment.package_image_url,
        status: shipment.status,
        progressStep: progressStep,
        progressIndex: progressIndex,
        createdAt: shipment.created_at,
        updatedAt: shipment.updated_at,
      },
      estimatedDeliveryDate: estimatedDate.toISOString(),
      events: transformedEvents,
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
