'use client';

import { useState } from 'react';
import type { Client } from '@/lib/db/schema';
import t from '@/lib/admin-translations-extended';
import { Mail, Phone, MessageCircle, Camera, User, ChevronDown, Users, Briefcase } from 'lucide-react';

interface ClientsTableProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
  onRefresh: () => void;
}

export default function ClientsTable({ clients, onClientClick, onRefresh }: ClientsTableProps) {
  const [sortBy, setSortBy] = useState<keyof Client>('lastOrderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'business'>('all');

  const handleSort = (field: keyof Client) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Filter clients by type
  const filteredClients = clients.filter(client => {
    if (filterType === 'all') return true;
    return client.clientType === filterType;
  });

  const sortedClients = [...filteredClients].sort((a, b) => {
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
        return <Mail className={className} />;
      case 'phone':
        return <Phone className={className} />;
      case 'whatsapp':
        return <MessageCircle className={className} />;
      case 'instagram':
        return <Camera className={className} />;
      default:
        return <User className={className} />;
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
        <ChevronDown
          className={`w-4 h-4 transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  );

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-12 text-center">
        <Users className="w-16 h-16 mx-auto text-charcoal-300 mb-4" />
        <h3 className="text-xl font-heading font-bold text-charcoal-700 mb-2">{t.noClients}</h3>
        <p className="text-charcoal-500 mb-4">Клиенты появятся здесь при создании заказов</p>
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors"
        >
          {t.refresh}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* Filter Tabs */}
      <div className="border-b-2 border-cream-200 bg-cream-50 px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-brown-500 text-white'
                : 'bg-white text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            Все ({clients.length})
          </button>
          <button
            onClick={() => setFilterType('individual')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              filterType === 'individual'
                ? 'bg-brown-500 text-white'
                : 'bg-white text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            <User className="w-4 h-4" />
            Физические лица ({clients.filter(c => c.clientType === 'individual' || !c.clientType).length})
          </button>
          <button
            onClick={() => setFilterType('business')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              filterType === 'business'
                ? 'bg-brown-500 text-white'
                : 'bg-white text-charcoal-700 hover:bg-cream-100'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Бизнес ({clients.filter(c => c.clientType === 'business').length})
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-cream-100 border-b-2 border-cream-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="name" label={t.name} />
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                Контакт
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="preferredContact" label="Предпочтительный" />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="totalOrders" label={t.orders} />
              </th>
              <th className="px-6 py-4 text-right text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="totalSpent" label={t.totalSpent} />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                <SortButton field="lastOrderDate" label={t.lastOrder} />
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-charcoal-700 uppercase tracking-wider">
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {sortedClients.map((client) => {
              const isBusiness = client.clientType === 'business';
              return (
              <tr
                key={client.id}
                className={`transition-colors cursor-pointer ${
                  isBusiness 
                    ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-amber-500'
                    : 'hover:bg-cream-50'
                }`}
                onClick={() => onClientClick(client)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="text-brown-600">
                      {getPreferredContactIcon(client.preferredContact, "w-6 h-6")}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-charcoal-900">
                          {client.name}
                        </p>
                        {isBusiness && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                            <Briefcase className="w-3 h-3" />
                            Бизнес
                          </span>
                        )}
                      </div>
                      {client.notes && (
                        <p className="text-xs text-charcoal-500 truncate max-w-xs mt-0.5">{client.notes}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-charcoal-700 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {client.phone}
                      </div>
                    )}
                    {client.instagramHandle && (
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4" />
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
                    {t.view}
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
