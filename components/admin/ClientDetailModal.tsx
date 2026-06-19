'use client';

import { useState, useEffect } from 'react';
import type { Client } from '@/lib/db/schema';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import DatePicker from '@/components/products/DatePicker';
import t from '@/lib/admin-translations-extended';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from './pdf/InvoicePDF';
import { Briefcase, X, FileDown, Download } from 'lucide-react';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface Order {
  id: string;
  order_number: string | null;
  total_amount: string;
  delivery_date: string | null;
  created_at: string;
  paid: boolean;
  channel: string;
  order_items?: OrderItem[];
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
  
  // Invoice generation state
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [invoiceFromDate, setInvoiceFromDate] = useState<Date | undefined>();
  const [invoiceToDate, setInvoiceToDate] = useState<Date | undefined>();
  // Removed: isGeneratingPDF state (no longer needed with PDFDownloadLink)
  const [formData, setFormData] = useState({
    name: client.name,
    email: client.email || '',
    phone: client.phone || '',
    whatsapp: client.whatsapp || '',
    instagram_handle: client.instagramHandle || '',
    preferred_contact: client.preferredContact || '',
    notes: client.notes || '',
    client_type: client.clientType || 'individual',
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
        alert(error.error || t.failedToDeleteClient);
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert(t.failedToDeleteClient);
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

  // Filter orders by date range for invoice
  const getFilteredOrders = () => {
    if (!invoiceFromDate && !invoiceToDate) return orders;
    
    return orders.filter(order => {
      const orderDate = new Date(order.created_at);
      const from = invoiceFromDate ? new Date(invoiceFromDate) : new Date(0);
      const to = invoiceToDate ? new Date(invoiceToDate) : new Date();
      
      // Set time to start/end of day for comparison
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      
      return orderDate >= from && orderDate <= to;
    });
  };

  const getInvoiceFilename = () => {
    const fromDateStr = invoiceFromDate 
      ? invoiceFromDate.toLocaleDateString('it-IT').replace(/\//g, '-') 
      : 'Inizio';
    const toDateStr = invoiceToDate 
      ? invoiceToDate.toLocaleDateString('it-IT').replace(/\//g, '-') 
      : 'Oggi';
    return `Fattura_${client.name.replace(/\s+/g, '_')}_${fromDateStr}_${toDateStr}.pdf`;
  };

  const getDateRangeForPDF = () => {
    return {
      from: invoiceFromDate ? invoiceFromDate.toLocaleDateString('it-IT') : null,
      to: invoiceToDate ? invoiceToDate.toLocaleDateString('it-IT') : null,
    };
  };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-heading font-bold text-white">
              {client.name}
            </h2>
            {client.clientType === 'business' && (
              <span className="px-3 py-1 bg-amber-400 text-charcoal-900 text-xs font-bold rounded-full flex items-center gap-1">
                <Briefcase className="w-3 h-3" />
                Бизнес
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-cream-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Client Details */}
          <div className="bg-white border-2 border-cream-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-charcoal-900">Информация о клиенте</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors text-sm font-semibold"
                >
                  {t.edit}
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {/* Client Type */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Тип клиента</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, client_type: 'individual' })}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                        formData.client_type === 'individual'
                          ? 'bg-brown-500 text-white border-brown-500'
                          : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
                      }`}
                    >
                      Физ. лицо
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, client_type: 'business' })}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                        formData.client_type === 'business'
                          ? 'bg-brown-500 text-white border-brown-500'
                          : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
                      }`}
                    >
                      Бизнес
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    {t.name}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">{t.email}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">{t.phone}</label>
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
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">{t.preferredContact}</label>
                  <select
                    value={formData.preferred_contact}
                    onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                    <option value="">Не установлено</option>
                    <option value="email">📧 Email</option>
                    <option value="phone">📞 Телефон</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="instagram">📸 Instagram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">{t.notes}</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    placeholder="Внутренние примечания о клиенте..."
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? t.saving : t.save}
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
                        client_type: client.clientType || 'individual',
                      });
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    {t.cancel}
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
                    Предпочтительный: {getPreferredContactIcon(client.preferredContact)} {client.preferredContact}
                  </p>
                )}
                {client.notes && (
                  <div className="mt-4 pt-4 border-t border-cream-200">
                    <p className="text-sm font-semibold text-charcoal-700 mb-1">{t.notes}:</p>
                    <p className="text-sm text-charcoal-600">{client.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="bg-white border-2 border-cream-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-charcoal-900">История заказов</h3>
              
              {/* Invoice Generator Button (only for business clients) */}
              {client.clientType === 'business' && orders.length > 0 && (
                <button
                  onClick={() => setShowInvoiceGenerator(!showInvoiceGenerator)}
                  className="flex items-center gap-2 px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors text-sm font-semibold"
                >
                  <FileDown className="w-4 h-4" />
                  Genera Fattura
                </button>
              )}
            </div>

            {/* Invoice Date Range Selector */}
            {showInvoiceGenerator && (
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <h4 className="text-sm font-semibold text-charcoal-900 mb-3">Seleziona periodo per la fattura</h4>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <DatePicker
                    selectedDate={invoiceFromDate}
                    onDateChange={setInvoiceFromDate}
                    locale="it"
                    minDate={new Date(2020, 0, 1)}
                    label="Дата начала"
                    placeholder="Выберите дату начала"
                    showHelperText={false}
                  />
                  <DatePicker
                    selectedDate={invoiceToDate}
                    onDateChange={setInvoiceToDate}
                    locale="it"
                    minDate={invoiceFromDate || new Date(2020, 0, 1)}
                    label="Дата окончания"
                    placeholder="Выберите дату окончания"
                    showHelperText={false}
                  />
                </div>
                <div className="flex gap-3">
                  {!invoiceFromDate || !invoiceToDate ? (
                    <button
                      disabled
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brown-500 text-white rounded-lg opacity-50 cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Scarica PDF
                    </button>
                  ) : (
                    <PDFDownloadLink
                      document={
                        <InvoicePDF
                          client={client}
                          orders={getFilteredOrders()}
                          dateRange={getDateRangeForPDF()}
                        />
                      }
                      fileName={getInvoiceFilename()}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors"
                    >
                      {({ loading }) =>
                        loading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generazione...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Scarica PDF
                          </>
                        )
                      }
                    </PDFDownloadLink>
                  )}
                  <button
                    onClick={() => setShowInvoiceGenerator(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {isLoadingOrders ? (
              <p className="text-charcoal-500 text-center py-8">Загрузка заказов...</p>
            ) : orders.length === 0 ? (
              <p className="text-charcoal-500 text-center py-8">Нет заказов</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 bg-cream-50 rounded-lg border border-cream-200 hover:border-brown-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-charcoal-900">
                          {order.order_number || `#${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-sm text-charcoal-600">
                          {order.delivery_date
                            ? new Date(order.delivery_date).toLocaleDateString('ru-RU')
                            : new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-brown-600">CHF {parseFloat(order.total_amount).toFixed(2)}</p>
                        <p className={`text-sm ${order.paid ? 'text-green-600' : 'text-orange-600'}`}>
                          {order.paid ? 'Оплачено' : 'Не оплачено'}
                        </p>
                      </div>
                    </div>

                    {/* Order items preview — uses data already loaded with the order */}
                    {order.order_items && order.order_items.length > 0 && (
                      <p className="mt-2 pt-2 border-t border-cream-200 text-sm text-charcoal-600">
                        {order.order_items
                          .map((item) => `${item.product_name} ×${item.quantity}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border-2 border-cream-200 rounded-xl p-4 text-center">
              <p className="text-sm text-charcoal-600 mb-1">Всего заказов</p>
              <p className="text-2xl font-bold text-brown-600">{client.totalOrders}</p>
            </div>
            <div className="bg-white border-2 border-cream-200 rounded-xl p-4 text-center">
              <p className="text-sm text-charcoal-600 mb-1">{t.totalSpent}</p>
              <p className="text-2xl font-bold text-brown-600">CHF {parseFloat(client.totalSpent || '0').toFixed(2)}</p>
            </div>
            <div className="bg-white border-2 border-cream-200 rounded-xl p-4 text-center">
              <p className="text-sm text-charcoal-600 mb-1">Первый заказ</p>
              <p className="text-lg font-semibold text-charcoal-900">
                {client.firstOrderDate ? new Date(client.firstOrderDate).toLocaleDateString('ru-RU') : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer - Delete Button */}
        <div className="bg-cream-100 px-6 py-4 border-t-2 border-cream-200">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isDeleting ? t.deleting : 'Удалить клиента'}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title={t.confirmDelete}
        message="Это действие нельзя отменить. Клиент будет удален навсегда."
        confirmText={t.delete}
        cancelText={t.cancel}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
