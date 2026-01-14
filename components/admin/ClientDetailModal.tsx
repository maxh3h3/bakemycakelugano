'use client';

import { useState, useEffect } from 'react';
import type { Client } from '@/lib/db/schema';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface Order {
  id: string;
  order_number: string | null;
  total_amount: string;
  delivery_date: string | null;
  created_at: string;
  paid: boolean;
  channel: string;
}

interface ClientDetailModalProps {
  client: Client;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => void;
  onDelete: () => void;
}

export default function ClientDetailModal({ client, onClose, onUpdate, onDelete }: ClientDetailModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email || '',
    phone: client.phone || '',
    whatsapp: client.whatsapp || '',
    instagram_handle: client.instagramHandle || '',
    preferred_contact: client.preferredContact || '',
    notes: client.notes || '',
  });

  // Fetch orders for this client
  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch(`/api/admin/clients/${client.id}`);
        if (response.ok) {
          const data = await response.json();
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setIsLoadingOrders(false);
      }
    }
    fetchOrders();
  }, [client.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        onUpdate(data.client);
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update client');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      alert('Failed to update client');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
        onClose();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const averageOrderValue = orders.length > 0
    ? (parseFloat(client.totalSpent || '0') / orders.length).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getPreferredContactIcon(client.preferredContact)}</span>
            <div>
              <h2 className="text-2xl font-heading font-bold">{client.name}</h2>
              <p className="text-sm text-white/80">Client Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-cream-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brown-600">{client.totalOrders || 0}</p>
              <p className="text-sm text-charcoal-600">Total Orders</p>
            </div>
            <div className="bg-cream-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brown-600">CHF {parseFloat(client.totalSpent || '0').toFixed(2)}</p>
              <p className="text-sm text-charcoal-600">Total Spent</p>
            </div>
            <div className="bg-cream-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-brown-600">CHF {averageOrderValue}</p>
              <p className="text-sm text-charcoal-600">Avg. Order Value</p>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white border-2 border-cream-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-charcoal-900">Contact Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors text-sm"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">WhatsApp</label>
                    <input
                      type="tel"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">Instagram</label>
                    <input
                      type="text"
                      value={formData.instagram_handle}
                      onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
                      placeholder="@username"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Preferred Contact</label>
                  <select
                    value={formData.preferred_contact}
                    onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                    <option value="">Not Set</option>
                    <option value="email">📧 Email</option>
                    <option value="phone">📞 Phone</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="instagram">📸 Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Internal notes about this client..."
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        name: client.name,
                        email: client.email || '',
                        phone: client.phone || '',
                        whatsapp: client.whatsapp || '',
                        instagram_handle: client.instagramHandle || '',
                        preferred_contact: client.preferredContact || '',
                        notes: client.notes || '',
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-charcoal-700">
                {client.email && <p className="flex items-center gap-2">📧 {client.email}</p>}
                {client.phone && <p className="flex items-center gap-2">📞 {client.phone}</p>}
                {client.whatsapp && <p className="flex items-center gap-2">💬 {client.whatsapp}</p>}
                {client.instagramHandle && <p className="flex items-center gap-2">📸 @{client.instagramHandle}</p>}
                {client.preferredContact && (
                  <p className="text-sm text-charcoal-500">
                    Preferred: {getPreferredContactIcon(client.preferredContact)} {client.preferredContact}
                  </p>
                )}
                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-cream-200">
                    <p className="text-sm font-semibold text-charcoal-700 mb-1">Notes:</p>
                    <p className="text-sm text-charcoal-600">{client.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="bg-white border-2 border-cream-200 rounded-xl p-6">
            <h3 className="text-lg font-heading font-bold text-charcoal-900 mb-4">Order History</h3>
            
            {isLoadingOrders ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brown-500 mx-auto"></div>
              </div>
            ) : orders.length === 0 ? (
              <p className="text-center text-charcoal-500 py-8">No orders yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-cream-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-charcoal-700">Order #</th>
                      <th className="px-4 py-2 text-left font-semibold text-charcoal-700">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-charcoal-700">Delivery</th>
                      <th className="px-4 py-2 text-center font-semibold text-charcoal-700">Payment</th>
                      <th className="px-4 py-2 text-right font-semibold text-charcoal-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cream-200">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-cream-50">
                        <td className="px-4 py-3 font-medium text-brown-600">
                          {order.order_number || order.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-charcoal-600">{formatDate(order.created_at)}</td>
                        <td className="px-4 py-3 text-charcoal-600">
                          {order.delivery_date ? formatDate(order.delivery_date) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                            order.paid 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {order.paid ? 'Paid' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-charcoal-900">
                          CHF {parseFloat(order.total_amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting || !!(client.totalOrders && client.totalOrders > 0)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={client.totalOrders && client.totalOrders > 0 ? 'Cannot delete client with orders' : 'Delete client'}
          >
            Delete Client
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-charcoal-700 text-white rounded-lg hover:bg-charcoal-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Client"
        message={`Are you sure you want to delete ${client.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
