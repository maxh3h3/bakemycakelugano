'use client';

import { useState } from 'react';
import type { Client } from '@/lib/db/schema';

interface ClientsTableProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
  onRefresh: () => void;
}

export default function ClientsTable({ clients, onClientClick, onRefresh }: ClientsTableProps) {
  const [sortBy, setSortBy] = useState<keyof Client>('lastOrderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Client) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedClients = [...clients].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];

    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getPreferredContactIcon = (preferredContact: string | null) => {
    switch (preferredContact) {
      case 'email':
        return '📧';
      case 'phone':
        return '📞';
      case 'whatsapp':
        return '💬';
      case 'instagram':
        return '📸';
      default:
        return '👤';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const SortButton = ({ field, label }: { field: keyof Client; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-brown-600 transition-colors"
    >
      {label}
      {sortBy === field && (
        <svg
          className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-charcoal-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 className="text-xl font-heading font-bold text-charcoal-700 mb-2">No Clients Yet</h3>
        <p className="text-charcoal-500 mb-4">Clients will appear here as orders are created</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cream-100 border-b-2 border-cream-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="name" label="Name" />
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="preferredContact" label="Preferred" />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="totalOrders" label="Orders" />
              </th>
              <th className="px-6 py-4 text-right text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="totalSpent" label="Total Spent" />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="lastOrderDate" label="Last Order" />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {sortedClients.map((client) => (
              <tr
                key={client.id}
                className="hover:bg-cream-50 transition-colors cursor-pointer"
                onClick={() => onClientClick(client)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getPreferredContactIcon(client.preferredContact)}</span>
                    <div>
                      <p className="font-semibold text-charcoal-900">{client.name}</p>
                      {client.notes && (
                        <p className="text-xs text-charcoal-500 truncate max-w-xs">{client.notes}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-charcoal-700">
                    {client.email && <div className="flex items-center gap-1">📧 {client.email}</div>}
                    {client.phone && <div className="flex items-center gap-1">📞 {client.phone}</div>}
                    {client.instagramHandle && <div className="flex items-center gap-1">📸 @{client.instagramHandle}</div>}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-2xl">{getPreferredContactIcon(client.preferredContact)}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold bg-brown-100 text-brown-700">
                    {client.totalOrders || 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <p className="font-bold text-charcoal-900">
                    CHF {parseFloat(client.totalSpent || '0').toFixed(2)}
                  </p>
                </td>
                <td className="px-6 py-4 text-center text-sm text-charcoal-600">
                  {formatDate(client.lastOrderDate)}
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClientClick(client);
                    }}
                    className="text-brown-600 hover:text-brown-800 font-semibold text-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
