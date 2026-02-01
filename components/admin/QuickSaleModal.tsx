'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/products/DatePicker';
import { X, User, Soup, Smartphone } from 'lucide-react';

interface QuickSaleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_CLIENTS = [
  {
    id: '06efda69-8386-4365-a2f7-3bcf5bdc483e',
    name: 'Витрина',
    icon: 'walkin',
  },
  {
    id: '9323a8bb-6ec4-481c-b040-aa762dc626bd',
    name: 'Раменная',
    icon: 'ramen',
  },
  {
    id: '5b8862a9-9ed1-4d60-85b2-9d13b69b0e3c',
    name: 'Divora',
    icon: 'mobile',
  },
];

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

export default function QuickSaleModal({ onClose, onSuccess }: QuickSaleModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Item builder for Раменная
  const [items, setItems] = useState<OrderItem[]>([{ product_name: '', quantity: 1, unit_price: 0 }]);
  
  const isRamennaya = selectedClient === '9323a8bb-6ec4-481c-b040-aa762dc626bd';
  
  // Lock body scroll when modal is open
  useEffect(() => {
    // Store original body overflow style
    const originalStyle = window.getComputedStyle(document.body).overflow;
    
    // Prevent scrolling on mount
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling on cleanup
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);
  
  // Calculate total for Раменная
  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedDate) {
      setError('Выберите дату');
      return;
    }

    if (!selectedClient) {
      setError('Выберите клиента');
      return;
    }

    // Validation based on client type
    if (isRamennaya) {
      // Validate items for Раменная
      if (items.length === 0) {
        setError('Добавьте хотя бы один товар');
        return;
      }
      
      for (const item of items) {
        if (!item.product_name.trim()) {
          setError('Заполните название товара');
          return;
        }
        if (item.quantity <= 0) {
          setError('Количество должно быть больше 0');
          return;
        }
        if (item.unit_price <= 0) {
          setError('Цена должна быть больше 0');
          return;
        }
      }
    } else {
      // Validate amount for other clients
      if (!amount || parseFloat(amount) <= 0) {
        setError('Введите сумму больше 0');
        return;
      }
      
      if (!description.trim()) {
        setError('Введите описание');
        return;
      }
    }

    setIsSaving(true);

    try {
      const deliveryDate = selectedDate.toISOString().split('T')[0];

      // Build order items based on client type
      const orderItems = isRamennaya 
        ? items.map(item => ({
            product_name: item.product_name.trim(),
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.quantity * item.unit_price,
          }))
        : [{
            product_name: description.trim(),
            quantity: 1,
            unit_price: parseFloat(amount),
            subtotal: parseFloat(amount),
          }];

      const totalAmount = isRamennaya ? calculateTotal() : parseFloat(amount);

      // Create immediate order with pre-existing client ID
      const orderData = {
        client_id: selectedClient,
        customer_name: 'Quick Sale',
        customer_phone: '+41000000000',
        delivery_date: deliveryDate,
        delivery_type: 'immediate',
        paid: true,
        payment_method: 'cash',
        channel: 'walk_in',
        total_amount: totalAmount,
        is_immediate: true,
        order_items: orderItems,
      };

      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create quick sale');
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating quick sale:', err);
      setError(err instanceof Error ? err.message : 'Не удалось создать продажу');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="bg-brown-500 px-6 py-4 rounded-t-2xl flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-heading font-bold text-white">
              Быстрая продажа
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-cream-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Date */}
          <DatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            locale="ru"
            required
            minDate={new Date(2020, 0, 1)}
            label="Дата"
            placeholder="Выберите дату"
            showHelperText={false}
          />

          {/* Quick Client Selection */}
          <div>
            <label className="block text-sm font-semibold text-charcoal-700 mb-2">
              Клиент <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {QUICK_CLIENTS.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClient(selectedClient === client.id ? null : client.id)}
                  className={`flex flex-col items-center justify-center gap-2 px-4 py-4 rounded-xl font-semibold transition-all border-2 ${
                    selectedClient === client.id
                      ? 'bg-brown-500 text-white border-brown-500 shadow-lg'
                      : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300 hover:bg-cream-50'
                  }`}
                >
                  {client.icon === 'walkin' ? (
                    <User className="w-8 h-8" />
                  ) : client.icon === 'ramen' ? (
                    <Soup className="w-8 h-8" />
                  ) : (
                    <Smartphone className="w-8 h-8" />
                  )}
                  <span className="text-sm">{client.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Input: Item Builder for Раменная OR Simple Amount for Others */}
          {isRamennaya ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-charcoal-700">
                  Товары <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setItems([...items, { product_name: '', quantity: 1, unit_price: 0 }])}
                  className="text-sm px-3 py-1 bg-brown-500 text-white rounded-lg hover:bg-brown-600 transition-colors"
                >
                  + Добавить товар
                </button>
              </div>
              
              {items.map((item, index) => (
                <div key={index} className="p-4 bg-cream-50 rounded-lg border-2 border-cream-200 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-charcoal-600">Товар #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems(items.filter((_, i) => i !== index))}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                  
                  <div>
                    <input
                      type="text"
                      value={item.product_name}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index].product_name = e.target.value;
                        setItems(newItems);
                      }}
                      placeholder="Название товара"
                      className="w-full px-3 py-2 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-charcoal-600 mb-1">Количество</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setItems(newItems);
                        }}
                        className="w-full px-3 py-2 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs text-charcoal-600 mb-1">Цена за шт.</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price || ''}
                        onChange={(e) => {
                          const newItems = [...items];
                          newItems[index].unit_price = parseFloat(e.target.value) || 0;
                          setItems(newItems);
                        }}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="text-right text-sm font-bold text-brown-600">
                    Итого: CHF {(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                </div>
              ))}
              
              {/* Total Amount Display */}
              <div className="p-4 bg-brown-100 border-2 border-brown-300 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-charcoal-900">Общая сумма:</span>
                  <span className="text-2xl font-bold text-brown-600">CHF {calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                  Сумма (CHF) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full px-4 py-3 text-lg font-bold border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                  Описание <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="например, Торт шоколадный 1кг"
                  className="w-full px-4 py-3 border-2 border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="flex-1"
              disabled={isSaving}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={isSaving || !selectedClient}
            >
              {isSaving ? 'Сохранение...' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
