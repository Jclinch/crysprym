// app/admin/settings/page.tsx
// Admin Settings - app/page-path: /admin/settings

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    companyName: 'cryspryms Pro',
    supportEmail: 'support@crysprymspro.com',
    defaultDeliveryDays: 5,
    maxShipmentWeight: 50,
    enableNotifications: true,
    maintenanceMode: false,
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Here you would make an actual API call to save settings
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1E293B] mb-2">Settings</h1>
        <p className="text-[#475569]">Configure platform settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General Settings */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1E293B] mb-6">General Settings</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Company Name
              </label>
              <Input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Support Email
              </label>
              <Input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => handleInputChange('supportEmail', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Default Delivery Days
              </label>
              <Input
                type="number"
                value={settings.defaultDeliveryDays}
                onChange={(e) => handleInputChange('defaultDeliveryDays', parseInt(e.target.value))}
                min="1"
                max="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                Max Shipment Weight (kg)
              </label>
              <Input
                type="number"
                value={settings.maxShipmentWeight}
                onChange={(e) => handleInputChange('maxShipmentWeight', parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
          </div>
        </Card>

        {/* System Settings */}
        <Card>
          <h2 className="text-xl font-semibold text-[#1E293B] mb-6">System Settings</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">
                  Enable Notifications
                </label>
                <p className="text-xs text-[#94A3B8]">Send email notifications for shipment updates</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.enableNotifications}
                  onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1">
                  Maintenance Mode
                </label>
                <p className="text-xs text-[#94A3B8]">Temporarily disable user access to the platform</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.maintenanceMode}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>
          </div>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          isLoading={saving}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}