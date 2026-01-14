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

  const getPreferredContactIcon = (preferredContact: string | null, className: string = "w-5 h-5") => {
    switch (preferredContact) {
      case 'email':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        );
      case 'phone':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        );
      case 'whatsapp':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'instagram':
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return (
          <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
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
                    <div className="text-brown-600">
                      {getPreferredContactIcon(client.preferredContact, "w-6 h-6")}
                    </div>
                    <div>
                      <p className="font-semibold text-charcoal-900">{client.name}</p>
                      {client.notes && (
                        <p className="text-xs text-charcoal-500 truncate max-w-xs">{client.notes}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-charcoal-700 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {client.phone}
                      </div>
                    )}
                    {client.instagramHandle && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        @{client.instagramHandle}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="inline-flex text-brown-600">
                    {getPreferredContactIcon(client.preferredContact, "w-8 h-8")}
                  </div>
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
