'use client';

import { useState, useEffect } from 'react';
import DatePicker from '@/components/products/DatePicker';
import ClientSearchInput from '@/components/admin/ClientSearchInput';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import { formatDateForDB, parseDateFromDB } from '@/lib/utils';
import t from '@/lib/admin-translations-extended';
import { X, CheckCircle, ShoppingBag, ChevronLeft, ChevronRight, Check, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { Database } from '@/lib/supabase/types';
import { getFlavours } from '@/lib/sanity/queries';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type DBClient = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: DBClient | null;
}

// ClientSearchInput uses camelCase field names
interface SearchClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  preferredContact: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderDate: string | null;
}

interface LocalItem {
  _localId: string;
  id?: string;          // undefined for new items
  product_name: string;
  quantity: string;
  unit_price: string;
  writing_on_cake: string;
  internal_decoration_notes: string;
  staff_notes: string;
  weight_kg: string;
  diameter_cm: string;
  selected_flavour: string;
  flavour_name: string;
  product_image_urls: string[];
  _deleted: boolean;
  _isNew: boolean;
  _expanded: boolean;
}

interface EditOrderModalProps {
  order: OrderWithItems;
  onClose: () => void;
  onSaved: () => void;
}

type Step = 1 | 2 | 3;

function dbClientToSearchClient(client: DBClient): SearchClient {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    instagramHandle: client.instagram_handle,
    preferredContact: client.preferred_contact,
    totalOrders: client.total_orders ?? 0,
    totalSpent: String(client.total_spent ?? '0'),
    lastOrderDate: client.last_order_date,
  };
}

let _localIdCounter = 0;
function newLocalId() { return `local_${++_localIdCounter}_${Date.now()}`; }

export default function EditOrderModal({ order, onClose, onSaved }: EditOrderModalProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingFee, setIsFetchingFee] = useState(false);
  const [flavours, setFlavours] = useState<any[]>([]);

  // Step 1: Client
  const [selectedClient, setSelectedClient] = useState<SearchClient | null>(
    order.client ? dbClientToSearchClient(order.client) : null
  );
  const [clientData, setClientData] = useState({
    customer_name: order.client?.name || '',
    customer_email: order.client?.email || '',
    customer_phone: order.client?.phone || '',
    customer_ig_handle: order.client?.instagram_handle || '',
    channel: (order.channel as 'phone' | 'whatsapp' | 'instagram' | 'email' | 'walk_in') || 'phone',
  });

  // Step 2: Items
  const [items, setItems] = useState<LocalItem[]>(
    order.order_items.map(item => ({
      _localId: newLocalId(),
      id: item.id,
      product_name: item.product_name,
      quantity: item.quantity.toString(),
      unit_price: item.unit_price.toString(),
      writing_on_cake: item.writing_on_cake || '',
      internal_decoration_notes: item.internal_decoration_notes || '',
      staff_notes: item.staff_notes || '',
      weight_kg: item.weight_kg?.toString() || '',
      diameter_cm: item.diameter_cm?.toString() || '',
      selected_flavour: item.selected_flavour || '',
      flavour_name: item.flavour_name || '',
      product_image_urls: item.product_image_urls || [],
      _deleted: false,
      _isNew: false,
      _expanded: false,
    }))
  );

  // Step 3: Delivery & Details
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
    order.delivery_date ? parseDateFromDB(order.delivery_date) : undefined
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(
    typeof (order as any).delivery_fee === 'number'
      ? (order as any).delivery_fee
      : parseFloat(String((order as any).delivery_fee || '0')) || 0
  );
  const [deliveryData, setDeliveryData] = useState({
    delivery_type: (order.delivery_type as 'pickup' | 'delivery') || 'pickup',
    delivery_time: order.delivery_time || '',
    delivery_address: (order.delivery_address as any)?.street || '',
    payment_method: order.payment_method || '',
    paid: order.paid ?? false,
    customer_notes: order.customer_notes || '',
  });

  // Lock body scroll
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Fetch flavours on mount
  useEffect(() => {
    getFlavours('en').then(data => setFlavours(data || [])).catch(console.error);
  }, []);

  // Auto-fetch delivery fee estimate when address changes
  useEffect(() => {
    if (deliveryData.delivery_type !== 'delivery' || !deliveryData.delivery_address.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsFetchingFee(true);
      try {
        const res = await fetch('/api/delivery-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullAddress: deliveryData.delivery_address }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (typeof data.fee === 'number') setDeliveryFee(data.fee);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') console.error('Delivery estimate error:', err);
      } finally {
        setIsFetchingFee(false);
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [deliveryData.delivery_address, deliveryData.delivery_type]);

  // Client handlers
  const handleClientSelect = (client: SearchClient) => {
    setSelectedClient(client);
    setClientData(prev => ({
      ...prev,
      customer_name: client.name,
      customer_email: client.email || '',
      customer_phone: client.phone || '',
      customer_ig_handle: client.instagramHandle || '',
      channel: client.preferredContact === 'instagram' ? 'instagram' :
               client.preferredContact === 'email' ? 'email' :
               client.preferredContact === 'whatsapp' ? 'whatsapp' :
               'phone',
    }));
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientData(prev => ({ ...prev, customer_name: '', customer_email: '', customer_phone: '', customer_ig_handle: '' }));
  };

  // Item handlers
  const addItem = () => {
    setItems(prev => [...prev, {
      _localId: newLocalId(),
      product_name: '',
      quantity: '1',
      unit_price: '',
      writing_on_cake: '',
      internal_decoration_notes: '',
      staff_notes: '',
      weight_kg: '',
      diameter_cm: '',
      selected_flavour: '',
      flavour_name: '',
      product_image_urls: [],
      _deleted: false,
      _isNew: true,
      _expanded: true,
    }]);
  };

  const deleteItem = (localId: string) => {
    setItems(prev => prev.map(item =>
      item._localId === localId ? { ...item, _deleted: true } : item
    ));
  };

  const updateItem = (localId: string, updates: Partial<LocalItem>) => {
    setItems(prev => prev.map(item =>
      item._localId === localId ? { ...item, ...updates } : item
    ));
  };

  const toggleItemExpanded = (localId: string) => {
    setItems(prev => prev.map(item =>
      item._localId === localId ? { ...item, _expanded: !item._expanded } : item
    ));
  };

  const handleFlavourChange = (localId: string, flavourId: string) => {
    if (flavourId === 'custom') {
      updateItem(localId, { selected_flavour: 'custom', flavour_name: '' });
    } else {
      const flavour = flavours.find((f: any) => f._id === flavourId);
      updateItem(localId, { selected_flavour: flavourId, flavour_name: flavour?.name || '' });
    }
  };

  const activeItems = items.filter(i => !i._deleted);

  // Step nav summaries
  const getClientSummary = () => clientData.customer_name || 'Клиент не выбран';
  const getItemsSummary = () => {
    const count = activeItems.length;
    if (count === 0) return 'Нет позиций';
    const total = activeItems.reduce((sum, i) =>
      sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0
    );
    return `${count} позиц. • CHF ${total.toFixed(2)}`;
  };
  const getDeliverySummary = () => {
    if (!deliveryDate) return 'Дата не выбрана';
    const date = deliveryDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
    return `${date} • ${deliveryData.delivery_type === 'pickup' ? t.pickup : t.delivery}`;
  };

  const handleSubmit = async () => {
    if (!deliveryDate) { alert(t.pleaseSelectDeliveryDate); return; }
    if (activeItems.length === 0) { alert('Добавьте хотя бы одну позицию'); return; }

    setIsSubmitting(true);
    try {
      const formattedDate = formatDateForDB(deliveryDate);
      const deliveryAddressObj = deliveryData.delivery_type === 'delivery' && deliveryData.delivery_address
        ? { street: deliveryData.delivery_address, city: '', postalCode: '', country: 'Switzerland' }
        : null;

      // Build PATCH payload for order metadata
      const payload: Record<string, unknown> = {
        delivery_type: deliveryData.delivery_type,
        delivery_date: formattedDate,
        delivery_time: deliveryData.delivery_time || null,
        delivery_address: deliveryAddressObj,
        delivery_fee: deliveryData.delivery_type === 'delivery' ? deliveryFee : 0,
        payment_method: deliveryData.payment_method || null,
        customer_notes: deliveryData.customer_notes || null,
        channel: clientData.channel,
      };

      // Include client_id only if it changed
      if (selectedClient && selectedClient.id !== order.client_id) {
        payload.client_id = selectedClient.id;
      }

      const paidChanged = deliveryData.paid !== (order.paid ?? false);

      // 1. PATCH order metadata
      const orderRes = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.error || 'Failed to update order');
      }

      // 2. DELETE removed existing items
      const deletedExisting = items.filter(i => i._deleted && !i._isNew && i.id);
      for (const item of deletedExisting) {
        await fetch(`/api/admin/orders/items/${item.id}`, { method: 'DELETE' });
      }

      // 3. PATCH modified existing items
      const existing = items.filter(i => !i._deleted && !i._isNew && i.id);
      for (const item of existing) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        await fetch(`/api/admin/orders/items/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: item.product_name,
            quantity: qty,
            unit_price: price,
            subtotal: qty * price,
            writing_on_cake: item.writing_on_cake || null,
            internal_decoration_notes: item.internal_decoration_notes || null,
            staff_notes: item.staff_notes || null,
            weight_kg: item.weight_kg || null,
            diameter_cm: item.diameter_cm ? parseFloat(item.diameter_cm) : null,
            selected_flavour: item.selected_flavour || null,
            flavour_name: item.flavour_name || null,
            product_image_urls: item.product_image_urls.length ? item.product_image_urls : null,
          }),
        });
      }

      // 4. POST new items
      const newItems = items.filter(i => !i._deleted && i._isNew);
      for (const item of newItems) {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        await fetch(`/api/admin/orders/${order.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_name: item.product_name,
            quantity: qty,
            unit_price: price,
            subtotal: qty * price,
            writing_on_cake: item.writing_on_cake || null,
            internal_decoration_notes: item.internal_decoration_notes || null,
            staff_notes: item.staff_notes || null,
            weight_kg: item.weight_kg || null,
            diameter_cm: item.diameter_cm ? parseFloat(item.diameter_cm) : null,
            selected_flavour: item.selected_flavour || null,
            flavour_name: item.flavour_name || null,
            product_image_urls: item.product_image_urls.length ? item.product_image_urls : null,
            delivery_date: formattedDate,
          }),
        });
      }

      // 5. Handle paid status change via dedicated endpoints
      if (paidChanged) {
        if (deliveryData.paid) {
          await fetch(`/api/admin/orders/${order.id}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ payment_method: deliveryData.payment_method || 'cash' }),
          });
        } else {
          await fetch(`/api/admin/orders/${order.id}/mark-unpaid`, { method: 'POST' });
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('Error updating order:', error);
      alert(error instanceof Error ? error.message : 'Failed to update order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { step: 1 as Step, label: 'Клиент', summary: getClientSummary() },
    { step: 2 as Step, label: 'Позиции', summary: getItemsSummary() },
    { step: 3 as Step, label: 'Детали', summary: getDeliverySummary() },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 text-white flex-shrink-0">
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/20">
            <h2 className="text-xl sm:text-2xl font-heading font-bold">
              Редактировать заказ {order.order_number || ''}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              title="Закрыть"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Step Navigation */}
          <div className="grid grid-cols-3 gap-2 px-6 py-4">
            {steps.map(({ step, label, summary }) => (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className={`text-left p-3 rounded-xl transition-all ${
                  currentStep === step
                    ? 'bg-white/20 ring-2 ring-white'
                    : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    currentStep === step ? 'bg-white text-brown-500' : 'bg-white/30'
                  }`}>
                    {step}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
                </div>
                <p className={`text-sm truncate ${currentStep === step ? 'text-white' : 'text-white/70'}`}>
                  {summary}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* STEP 1: Client */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-1">Информация о клиенте</h3>
                <p className="text-charcoal-600">Для кого этот заказ?</p>
              </div>

              <ClientSearchInput onClientSelect={handleClientSelect} onCreateNew={handleClearClient} />

              {selectedClient && (
                <div className="p-4 bg-white border-2 border-brown-300 rounded-lg shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-brown-600" />
                        <p className="font-bold text-brown-800 text-lg">{selectedClient.name}</p>
                      </div>
                      <div className="ml-7 space-y-1">
                        <p className="text-sm text-charcoal-700">
                          {selectedClient.email || selectedClient.phone || selectedClient.instagramHandle}
                        </p>
                        {selectedClient.totalOrders > 0 && (
                          <div className="flex items-center gap-3 text-sm text-brown-700 font-medium mt-2">
                            <span className="inline-flex items-center gap-1">
                              <ShoppingBag className="w-4 h-4" />
                              {selectedClient.totalOrders} order{selectedClient.totalOrders > 1 ? 's' : ''}
                            </span>
                            <span>•</span>
                            <span>CHF {parseFloat(selectedClient.totalSpent).toFixed(2)} total</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleClearClient}
                      className="px-3 py-1.5 text-sm text-charcoal-600 hover:text-charcoal-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                    >
                      Очистить
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Имя клиента <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientData.customer_name}
                      onChange={(e) => setClientData(prev => ({ ...prev, customer_name: e.target.value }))}
                      placeholder="Полное имя"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>

                  {(clientData.channel === 'phone' || clientData.channel === 'whatsapp' || clientData.channel === 'walk_in') && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">Номер телефона</label>
                      <input
                        type="tel"
                        value={clientData.customer_phone}
                        onChange={(e) => setClientData(prev => ({ ...prev, customer_phone: e.target.value }))}
                        placeholder="+41 XX XXX XX XX"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}
                  {clientData.channel === 'instagram' && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">Instagram</label>
                      <input
                        type="text"
                        value={clientData.customer_ig_handle}
                        onChange={(e) => setClientData(prev => ({ ...prev, customer_ig_handle: e.target.value }))}
                        placeholder="@username"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}
                  {clientData.channel === 'email' && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={clientData.customer_email}
                        onChange={(e) => setClientData(prev => ({ ...prev, customer_email: e.target.value }))}
                        placeholder="client@email.com"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Канал связи</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'phone', label: '📞 Телефон' },
                      { value: 'whatsapp', label: '💬 WhatsApp' },
                      { value: 'instagram', label: '📷 Instagram' },
                      { value: 'email', label: '✉️ Email' },
                      { value: 'walk_in', label: '🚶 Лично' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setClientData(prev => ({ ...prev, channel: opt.value as any }))}
                        className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                          clientData.channel === opt.value
                            ? 'bg-brown-500 text-white border-brown-500'
                            : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Items */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-1">Позиции заказа</h3>
                <p className="text-charcoal-600">Товары в этом заказе</p>
              </div>

              <div className="space-y-3">
                {items.filter(i => !i._deleted).map((item) => (
                  <div key={item._localId} className="bg-white border-2 border-cream-300 rounded-xl overflow-hidden">
                    {/* Item Card Header */}
                    <div
                      className="flex items-center gap-3 p-4 cursor-pointer hover:bg-cream-50 transition-colors"
                      onClick={() => toggleItemExpanded(item._localId)}
                    >
                      <ChevronDown className={`w-4 h-4 text-charcoal-500 flex-shrink-0 transition-transform ${item._expanded ? 'rotate-180' : ''}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-charcoal-900 truncate">
                          {item.product_name || <span className="text-charcoal-400 italic">Без названия</span>}
                        </p>
                        <p className="text-sm text-charcoal-500">
                          {item.quantity} × CHF {parseFloat(item.unit_price || '0').toFixed(2)} = CHF {((parseFloat(item.quantity || '0')) * (parseFloat(item.unit_price || '0'))).toFixed(2)}
                        </p>
                      </div>
                      {item._isNew && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">Новая</span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deleteItem(item._localId); }}
                        className="p-1.5 rounded-full text-rose-500 hover:bg-rose-50 transition-colors flex-shrink-0"
                        title="Удалить позицию"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Item Edit Fields */}
                    {item._expanded && (
                      <div className="border-t-2 border-cream-200 p-4 space-y-3">
                        {/* Product Name */}
                        <div>
                          <label className="block text-xs font-semibold text-charcoal-700 mb-1">Название *</label>
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => updateItem(item._localId, { product_name: e.target.value })}
                            placeholder="напр., Торт Малина"
                            className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Количество *</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(item._localId, { quantity: e.target.value })}
                              step="0.01" min="0"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Цена (CHF) *</label>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(item._localId, { unit_price: e.target.value })}
                              step="0.01" min="0"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Вес (кг)</label>
                            <input
                              type="text"
                              value={item.weight_kg}
                              onChange={(e) => updateItem(item._localId, { weight_kg: e.target.value })}
                              placeholder="Необязательно"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-charcoal-700 mb-1">Диаметр (см)</label>
                            <input
                              type="number"
                              value={item.diameter_cm}
                              onChange={(e) => updateItem(item._localId, { diameter_cm: e.target.value })}
                              step="0.01" min="0"
                              placeholder="Необязательно"
                              className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                            />
                          </div>
                        </div>

                        {/* Flavour */}
                        <div>
                          <label className="block text-xs font-semibold text-charcoal-700 mb-1">Вкус</label>
                          <select
                            value={item.selected_flavour || ''}
                            onChange={(e) => handleFlavourChange(item._localId, e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                          >
                            <option value="">Без вкуса</option>
                            {flavours.map((f: any) => (
                              <option key={f._id} value={f._id}>{f.name}</option>
                            ))}
                            <option value="custom">Свой вкус (вручную)</option>
                          </select>
                          {item.selected_flavour === 'custom' && (
                            <input
                              type="text"
                              value={item.flavour_name}
                              onChange={(e) => updateItem(item._localId, { flavour_name: e.target.value })}
                              placeholder="напр., Малина-фисташка"
                              className="w-full px-3 py-2 mt-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                            />
                          )}
                        </div>

                        {/* Images */}
                        <MultiImageUpload
                          value={item.product_image_urls}
                          onChange={(urls) => updateItem(item._localId, { product_image_urls: urls })}
                          label="Фото"
                        />

                        {/* Writing on Cake */}
                        <div>
                          <label className="block text-xs font-semibold text-charcoal-700 mb-1">Надпись на торте</label>
                          <input
                            type="text"
                            value={item.writing_on_cake}
                            onChange={(e) => updateItem(item._localId, { writing_on_cake: e.target.value })}
                            placeholder="Текст для клиента"
                            className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-sm"
                          />
                        </div>

                        {/* Internal Decoration Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-charcoal-700 mb-1">Заметки по декору</label>
                          <textarea
                            value={item.internal_decoration_notes}
                            onChange={(e) => updateItem(item._localId, { internal_decoration_notes: e.target.value })}
                            placeholder="Внутренние заметки для декораторов"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none text-sm"
                          />
                        </div>

                        {/* Staff Notes */}
                        <div>
                          <label className="block text-xs font-semibold text-charcoal-700 mb-1">Заметки персонала</label>
                          <textarea
                            value={item.staff_notes}
                            onChange={(e) => updateItem(item._localId, { staff_notes: e.target.value })}
                            placeholder="Общие заметки персонала"
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none text-sm"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="pt-2 border-t border-cream-200 flex justify-between items-center">
                          <span className="text-sm text-charcoal-600">Подытог:</span>
                          <span className="font-bold text-brown-500">
                            CHF {((parseFloat(item.quantity || '0')) * (parseFloat(item.unit_price || '0'))).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Add Item Button */}
                <button
                  type="button"
                  onClick={addItem}
                  className="w-full p-4 border-2 border-dashed border-brown-300 rounded-xl hover:border-brown-500 hover:bg-brown-50 transition-all text-brown-600 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Добавить позицию
                </button>
              </div>

              {/* Order Total */}
              {activeItems.length > 0 && (
                <div className="bg-cream-50 border-2 border-cream-300 rounded-xl p-4 flex justify-between items-center">
                  <span className="font-semibold text-charcoal-700">Итого заказа:</span>
                  <span className="text-xl font-bold text-brown-500">
                    CHF {activeItems.reduce((sum, i) =>
                      sum + (parseFloat(i.quantity || '0') * parseFloat(i.unit_price || '0')), 0
                    ).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Delivery & Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-1">Доставка и детали</h3>
                <p className="text-charcoal-600">Когда, как и оплата</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    selectedDate={deliveryDate}
                    onDateChange={setDeliveryDate}
                    locale="ru"
                    required
                    showHelperText={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    {t.deliveryType} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={deliveryData.delivery_type}
                    onChange={(e) => {
                      const newType = e.target.value as 'pickup' | 'delivery';
                      setDeliveryData(prev => ({
                        ...prev,
                        delivery_type: newType,
                        delivery_address: newType === 'pickup' ? '' : prev.delivery_address,
                      }));
                      if (newType === 'pickup') setDeliveryFee(0);
                    }}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                    <option value="pickup">🏪 {t.pickup}</option>
                    <option value="delivery">🚗 {t.delivery}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    {t.deliveryPickupTimeOptional}
                  </label>
                  <input
                    type="text"
                    value={deliveryData.delivery_time}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, delivery_time: e.target.value }))}
                    placeholder="напр. 14:30, после обеда, 14:00-16:00"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>

                {deliveryData.delivery_type === 'delivery' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        {t.deliveryAddress}
                      </label>
                      <input
                        type="text"
                        value={deliveryData.delivery_address}
                        onChange={(e) => setDeliveryData(prev => ({ ...prev, delivery_address: e.target.value }))}
                        placeholder="напр., Bahnhofstrasse 10, Zürich 8001"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                      <p className="text-xs text-charcoal-500 mt-1">Введите полный адрес: улица, город, индекс</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Стоимость доставки (CHF)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={deliveryFee}
                          onChange={(e) => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                          className={`w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none ${isFetchingFee ? 'pr-36' : ''}`}
                        />
                        {isFetchingFee && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-500 animate-pulse">
                            Рассчитывается...
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-500 mt-1">Рассчитывается автоматически — можно изменить вручную</p>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Способ оплаты</label>
                  <select
                    value={deliveryData.payment_method}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                    <option value="">Не указано</option>
                    <option value="cash">💵 Наличные</option>
                    <option value="twint">💳 Twint</option>
                    <option value="stripe">💳 Карта (Stripe)</option>
                  </select>
                </div>

                <div className="flex items-center pt-7">
                  <input
                    type="checkbox"
                    id="edit-order-paid"
                    checked={deliveryData.paid}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, paid: e.target.checked }))}
                    className="w-5 h-5 rounded border-2 border-cream-300 text-brown-500 focus:ring-brown-500"
                  />
                  <label htmlFor="edit-order-paid" className="ml-3 text-sm font-semibold text-charcoal-700 cursor-pointer">
                    ✓ Отметить как оплаченный
                  </label>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">Заметки клиента</label>
                  <textarea
                    value={deliveryData.customer_notes}
                    onChange={(e) => setDeliveryData(prev => ({ ...prev, customer_notes: e.target.value }))}
                    rows={4}
                    placeholder="Инструкции по доставке, особые пожелания, аллергии..."
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 p-6 flex justify-between items-center flex-shrink-0">
          <div>
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300"
              >
                Отмена
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep - 1) as Step)}
                className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300 flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            )}
          </div>

          <div>
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((currentStep + 1) as Step)}
                className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors flex items-center gap-2"
              >
                Далее
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !clientData.customer_name.trim() || !deliveryDate || activeItems.length === 0}
                className="px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  'Сохранение...'
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Сохранить изменения
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
