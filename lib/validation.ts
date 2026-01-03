// src/lib/validation.ts
// Form validation schemas

import { z } from 'zod';

// New Shipment Form Schema
export const NewShipmentSchema = z.object({
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  pickupAddress: z.string().min(5, 'Street address is required'),
  pickupCity: z.string().min(2, 'City is required'),
  pickupPostalCode: z.string().min(3, 'Postal code is required'),
  
  deliveryLocation: z.string().min(1, 'Delivery location is required'),
  deliveryAddress: z.string().min(5, 'Street address is required'),
  deliveryCity: z.string().min(2, 'City is required'),
  deliveryPostalCode: z.string().min(3, 'Postal code is required'),
  
  shipmentType: z.enum(['standard', 'express', 'overnight'], {
    errorMap: () => ({ message: 'Please select a shipment type' }),
  }),
  
  weightKg: z.coerce
    .number()
    .positive('Weight must be greater than 0'),
  
  lengthCm: z.coerce.number().optional(),
  widthCm: z.coerce.number().optional(),
  heightCm: z.coerce.number().optional(),
  
  contentsDescription: z.string().optional(),
  
  insuranceRequired: z.boolean().optional(),
  insuranceAmount: z.coerce.number().optional(),
  signatureRequired: z.boolean().optional(),
  specialHandling: z.string().optional(),
  
  referenceNumber: z.string().optional(),
  specialInstructions: z.string().optional(),
});

export type NewShipmentFormData = z.infer<typeof NewShipmentSchema>;

// Live Tracking Schema
export const LiveTrackingSchema = z.object({
  trackingNumber: z
    .string()
    .min(5, 'Tracking number is required')
    .regex(/^CRY-\d{3}-\d{4}$/i, 'Invalid tracking number format'),
});

export type LiveTrackingFormData = z.infer<typeof LiveTrackingSchema>;
