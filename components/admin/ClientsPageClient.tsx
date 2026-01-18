'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ClientsTable from '@/components/admin/ClientsTable';
import ClientDetailModal from '@/components/admin/ClientDetailModal';
import ClientForm, { type ClientFormData } from '@/components/admin/ClientForm';
import type { Client } from '@/lib/db/schema';
import t from '@/lib/admin-translations-extended';

export default function ClientsPageClient() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPreferredContact, setFilterPreferredContact] = useState('');

  // Fetch clients
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterPreferredContact) params.append('preferredContact', filterPreferredContact);
      params.append('limit', '100'); // Get more clients for admin view

      const response = await fetch(`/api/admin/clients?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else if (response.status === 401) {
        // Unauthorized, redirect to login
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [searchQuery, filterPreferredContact]);

  const handleCreateClient = async (data: ClientFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setIsCreating(false);
        fetchClients(); // Refresh list
      } else {
        const error = await response.json();
        alert(error.error || 'Не удалось создать клиента');
      }
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Не удалось создать клиента');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClient = (updatedClient: Client) => {
    // Update client in list
    setClients((prev) =>
      prev.map((c) => (c.id === updatedClient.id ? updatedClient : c))
    );
    setSelectedClient(updatedClient);
  };

  const handleDeleteClient = () => {
    // Remove client from list
    if (selectedClient) {
      setClients((prev) => prev.filter((c) => c.id !== selectedClient.id));
      setSelectedClient(null);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-charcoal-900 mb-2">{t.clients}</h1>
          <p className="text-charcoal-600">Управление отношениями с клиентами</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-3xl font-bold text-brown-600">{clients.length}</p>
            <p className="text-sm text-charcoal-600">Всего клиентов</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-3xl font-bold text-brown-600">
              {clients.filter((c) => c.totalOrders && c.totalOrders > 0).length}
            </p>
            <p className="text-sm text-charcoal-600">Активные клиенты</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-3xl font-bold text-brown-600">
              {clients.filter((c) => c.totalOrders && c.totalOrders > 3).length}
            </p>
            <p className="text-sm text-charcoal-600">Постоянные клиенты</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-3xl font-bold text-brown-600">
              CHF{' '}
              {clients
                .reduce((sum, c) => sum + parseFloat(c.totalSpent || '0'), 0)
                .toFixed(2)}
            </p>
            <p className="text-sm text-charcoal-600">{t.revenue}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="flex-1 w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени, email или телефону..."
                  className="w-full px-4 py-2 pl-10 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                />
                <svg
                  className="w-5 h-5 text-charcoal-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Filter */}
            <div className="w-full md:w-48">
              <select
                value={filterPreferredContact}
                onChange={(e) => setFilterPreferredContact(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              >
                <option value="">Все контакты</option>
                <option value="email">📧 Email</option>
                <option value="phone">📞 Телефон</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="instagram">📸 Instagram</option>
              </select>
            </div>

            {/* Create Button */}
            <button
              onClick={() => setIsCreating(true)}
              className="w-full md:w-auto px-6 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t.newClient}
            </button>
          </div>
        </div>

        {/* Clients Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500 mx-auto mb-4"></div>
            <p className="text-charcoal-600">{t.loading}</p>
          </div>
        ) : (
          <ClientsTable
            clients={clients}
            onClientClick={setSelectedClient}
            onRefresh={fetchClients}
          />
        )}

        {/* Client Detail Modal */}
        {selectedClient && (
          <ClientDetailModal
            client={selectedClient}
            onClose={() => setSelectedClient(null)}
            onUpdate={handleUpdateClient}
            onDelete={handleDeleteClient}
          />
        )}

        {/* Create Client Modal */}
        {isCreating && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-heading font-bold">{t.newClient}</h2>
                  <p className="text-sm text-white/80">Добавить нового клиента в систему</p>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ClientForm
                  onSubmit={handleCreateClient}
                  onCancel={() => setIsCreating(false)}
                  isLoading={isSaving}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
