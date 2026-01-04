// // ============================================
// // FILE: app/dashboard/new-shipment/page.tsx
// // Path: /dashboard/new-shipment
// // Pixel Perfect New Shipment Page matching Figma design
// // ============================================
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs } from '@/components/Sidebar';
import { createClient } from '@/utils/supabase/client';
import { LOCATIONS } from '@/lib/locations';

const STORAGE_BUCKET = 'package-images';

export default function NewShipmentPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    shipmentDate: '',
    senderName: '',
    receiverName: '',
    receiverPhone: '',
    itemsDescription: '',
    weight: '',
    originLocation: '',
    destination: '',
  });

  const [packageImage, setPackageImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setErrors({ image: 'Image must be under 1MB' });
      return;
    }
    setPackageImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const isFormValid =
    formData.shipmentDate &&
    formData.senderName &&
    formData.receiverName &&
    formData.receiverPhone &&
    formData.itemsDescription &&
    formData.weight &&
    formData.originLocation &&
    formData.destination;

  const handleCreateShipment = async () => {
    if (!isFormValid) return;

    setIsLoading(true);
    setErrors({});

    try {
      let packageImageUrl = '';
      let packageImageBucket = '';
      let packageImagePath = '';

      // Upload image if provided (optional - shipment will be created even if image upload fails)
      if (packageImage) {
        try {
          const fileName = `${Date.now()}-${packageImage.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, packageImage);

          if (uploadError) {
            console.error('Image upload error:', uploadError);
            // Continue without image instead of failing
          } else if (uploadData) {
            packageImagePath = uploadData.path;
            packageImageBucket = STORAGE_BUCKET;
            
            const { data: { publicUrl } } = supabase.storage
              .from(STORAGE_BUCKET)
              .getPublicUrl(uploadData.path);
            
            packageImageUrl = publicUrl || '';
          }
        } catch (imageError) {
          console.error('Image upload exception:', imageError);
          // Continue without image
        }
      }

      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setErrors({ form: 'You must be logged in to create a shipment' });
        setIsLoading(false);
        return;
      }

      // Create shipment
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          shipmentDate: formData.shipmentDate,
          senderName: formData.senderName,
          receiverName: formData.receiverName,
          receiverPhone: formData.receiverPhone,
          itemsDescription: formData.itemsDescription,
          weight: formData.weight,
          originLocation: formData.originLocation,
          destination: formData.destination,
          packageImageBucket,
          packageImagePath,
          packageImageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setErrors({ form: error.error || 'Failed to create shipment' });
        setIsLoading(false);
        return;
      }

      await response.json();
      
      // Reset form and redirect
      setFormData({
        shipmentDate: '',
        senderName: '',
        receiverName: '',
        receiverPhone: '',
        itemsDescription: '',
        weight: '',
        originLocation: '',
        destination: '',
      });
      setPackageImage(null);
      setImagePreview('');
      
      // Redirect to shipment details
      // window.location.href = `/dashboard/shipment/${shipment.id}`;
    } catch (error) {
      console.error('Error creating shipment:', error);
      setErrors({ form: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="max-w-full mx-auto"
      >
        <div className=" bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <Tabs />

          <div className="p-4 sm:p-8">
            <h2 className="text-[20px] font-semibold text-slate-800 mb-1">
              New Shipment Input
            </h2>
            <p className="text-[13px] text-slate-500 mb-8">
              Create a new shipment request for CRYSPRYM logistics
            </p>

            {/* Sender / Receiver */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {(['senderName', 'receiverName'] as const).map((field, i) => (
                <div key={field}>
                  <label className="block text-[13px] font-medium text-gray-700 mb-2">
                    {i === 0 ? "Dispatch Name" : "Receiver's Name"}
                  </label>
                  <input
                    name={field}
                    value={formData[field]}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                    className="w-full h-12 px-4 text-[14px] border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              ))}
            </div>

            {/* Receiver Phone */}
            <div className="mb-4 w-full md:w-1/2">
              <label className="block text-[13px] font-medium text-gray-700 mb-2">
                Receiver&apos;s Phone Number
              </label>
              <input
                type="tel"
                name="receiverPhone"
                value={formData.receiverPhone}
                onChange={handleInputChange}
                placeholder="e.g. +234 801 234 5678"
                className="w-full h-12 px-4 text-[14px] border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Shipment Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium mb-2">
                  Shipment Date
                </label>
                <input
                  type="date"
                  name="shipmentDate"
                  value={formData.shipmentDate}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 text-[14px] border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="block text-[13px] font-medium mb-2">
                Items Description
              </label>
              <textarea
                name="itemsDescription"
                rows={4}
                value={formData.itemsDescription}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-[14px] border border-gray-300 rounded-md resize-none"
              />
            </div>

            {/* Weight */}
            <div className="mb-6 mt-4 w-full md:w-60">
              <label className="block text-[13px] font-medium mb-2">Weight</label>
              <input
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                className="w-full h-12 px-4 border border-gray-300 rounded-md"
              />
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <label className="block text-[13px] font-medium mb-2">
                Package Image (Max 1mb)
              </label>

              <label className="inline-flex items-center px-5 py-2 bg-[#eae5e5] text-[#535250] rounded-full cursor-pointer">
                Choose File
                <input type="file" hidden onChange={handleImageChange} />
              </label>

              {imagePreview && (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={300}
                  height={120}
                  className="mt-4 rounded-md border"
                />
              )}
            </div>

            {/* Locations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Origin Location
                </label>
                <select
                  name="originLocation"
                  value={formData.originLocation}
                  onChange={handleInputChange}
                  className="h-12 px-4 border border-gray-300 rounded-md w-full bg-white"
                >
                  <option value="">Select origin</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-700 mb-2">
                  Destination
                </label>
                <select
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className="h-12 px-4 border border-gray-300 rounded-md w-full bg-white"
                >
                  <option value="">Select destination</option>
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error Message */}
            {errors.form && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.form}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreateShipment}
              disabled={!isFormValid || isLoading}
              className={`w-full h-14 rounded-xl cursor-pointer font-semibold text-[15px] transition ${
                isFormValid
                  ? 'bg-[#2c2b2a] text-white hover:bg-[#4b4a48]' //
                  : 'bg-[#D1D5DB] text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? 'Creating Shipment...' : 'Create Shipment'}
            </button>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
