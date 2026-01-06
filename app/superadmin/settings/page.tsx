'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';

type LocationRow = {
	id: string;
	name: string;
	is_active: boolean;
	created_at?: string;
	updated_at?: string;
};

export default function SuperadminSettingsPage() {
	const [locations, setLocations] = useState<LocationRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [newName, setNewName] = useState('');

	const activeCount = useMemo(() => locations.filter((l) => l.is_active).length, [locations]);

	const loadLocations = async () => {
		setLoading(true);
		try {
			const res = await fetch('/api/admin/locations');
			if (!res.ok) {
				setLocations([]);
				return;
			}
			const data = await res.json();
			setLocations(Array.isArray(data?.locations) ? data.locations : []);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadLocations();
	}, []);

	const handleAdd = async () => {
		const name = newName.trim();
		if (!name) return;
		setCreating(true);
		try {
			const res = await fetch('/api/admin/locations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name }),
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				alert(err.error || 'Failed to add location');
				return;
			}
			setNewName('');
			await loadLocations();
		} finally {
			setCreating(false);
		}
	};

	const handleToggleActive = async (loc: LocationRow) => {
		const res = await fetch(`/api/admin/locations/${loc.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ is_active: !loc.is_active }),
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err.error || 'Failed to update location');
			return;
		}
		await loadLocations();
	};

	const handleRemove = async (loc: LocationRow) => {
		const ok = window.confirm(`Remove location "${loc.name}"? (It will be deactivated.)`);
		if (!ok) return;
		const res = await fetch(`/api/admin/locations/${loc.id}`, {
			method: 'DELETE',
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err.error || 'Failed to remove location');
			return;
		}
		await loadLocations();
	};

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl font-bold text-[#1E293B] mb-2">Settings</h1>
				<p className="text-[#475569]">SuperAdmin platform configuration</p>
			</div>

			<Card>
				<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
					<div>
						<h2 className="text-xl font-semibold text-[#1E293B] mb-1">Location Management</h2>
						<p className="text-sm text-[#64748B]">
							Manage dispatch/destination addresses used across the platform. Active: {activeCount}
						</p>
					</div>
					<Button variant="secondary" onClick={loadLocations} disabled={loading}>
						{loading ? 'Refreshing...' : 'Refresh'}
					</Button>
				</div>

				<div className="mt-6 flex flex-col sm:flex-row gap-3">
					<div className="flex-1">
						<label className="block text-sm font-medium text-[#1E293B] mb-2">Add new location</label>
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							placeholder="e.g. ASC-NEW-HUB-IKORODU"
						/>
					</div>
					<div className="sm:pt-8">
						<Button onClick={handleAdd} isLoading={creating} disabled={creating || !newName.trim()}>
							Add Location
						</Button>
					</div>
				</div>

				<div className="mt-6 overflow-hidden rounded-md border border-[#E2E8F0] bg-white">
					<div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#F8FAFC] text-sm font-medium text-[#1E293B]">
						<div className="col-span-7">Location</div>
						<div className="col-span-2">Status</div>
						<div className="col-span-3 text-right">Actions</div>
					</div>
					{loading ? (
						<div className="p-6 text-sm text-[#94A3B8]">Loading locations...</div>
					) : locations.length === 0 ? (
						<div className="p-6 text-sm text-[#94A3B8]">No locations found</div>
					) : (
						<div className="divide-y divide-[#E2E8F0]">
							{locations.map((loc) => (
								<div key={loc.id} className="grid grid-cols-12 gap-3 px-4 py-4 items-center">
									<div className="col-span-7 text-sm text-[#0F2940] font-medium">{loc.name}</div>
									<div className="col-span-2 text-sm">
										<span
											className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
												loc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
											}`}
										>
											{loc.is_active ? 'Active' : 'Inactive'}
										</span>
									</div>
									<div className="col-span-3 flex justify-end gap-2">
										<Button
											size="small"
											variant="secondary"
											onClick={() => handleToggleActive(loc)}
										>
											{loc.is_active ? 'Deactivate' : 'Activate'}
										</Button>
										<Button
											size="small"
											onClick={() => handleRemove(loc)}
											className="bg-red-600 text-white hover:bg-red-700"
										>
											Remove
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</Card>
		</div>
	);
}
