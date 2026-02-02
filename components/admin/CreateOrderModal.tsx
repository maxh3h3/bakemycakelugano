'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFlavours } from '@/lib/sanity/queries';
import DatePicker from '@/components/products/DatePicker';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import ClientSearchInput from '@/components/admin/ClientSearchInput';
import AIOrderAssistantModal from '@/components/admin/AIOrderAssistantModal';
import { formatDateForDB } from '@/lib/utils';
import type { AIExtractedOrderData } from '@/types/ai-order';
import t from '@/lib/admin-translations-extended';
import { Zap, Lightbulb, X, CheckCircle, ShoppingBag, Phone, MessageCircle, Camera, Mail, User, Plus, Package, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface CreateOrderModalProps {
  onClose: () => void;
  initialData?: AIExtractedOrderData; // AI-extracted data for pre-filling
}

interface OrderItem {
  product_name: string;
  product_image_urls: string[];
  quantity: number;
  unit_price: number;
  selected_flavour: string | null;
  flavour_name: string | null;
  weight_kg: string | null;
  diameter_cm: number | null;
  writing_on_cake: string | null;
  internal_decoration_notes: string | null;
  staff_notes: string | null;
}

type Step = 1 | 2 | 3;

export default function CreateOrderModal({ onClose, initialData }: CreateOrderModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flavours, setFlavours] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(
    initialData?.delivery_date ? new Date(initialData.delivery_date) : undefined
  );
  
  // AI Assistant modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [isAIPrefilled, setIsAIPrefilled] = useState(!!initialData);
  
  // Client selection state
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  
  const [formData, setFormData] = useState<{
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    customer_ig_handle: string;
    delivery_type: 'pickup' | 'delivery';
    delivery_time: string;
    delivery_address: string;
    customer_notes: string;
    payment_method: string;
    paid: boolean;
    channel: 'phone' | 'whatsapp' | 'instagram' | 'email' | 'walk_in';
  }>({
    customer_name: initialData?.customer_name || '',
    customer_email: initialData?.customer_email || '',
    customer_phone: initialData?.customer_phone || '',
    customer_ig_handle: initialData?.customer_ig_handle || '',
    delivery_type: initialData?.delivery_type || 'pickup',
    delivery_time: initialData?.delivery_time || '',
    delivery_address: initialData?.delivery_address || '',
    customer_notes: initialData?.customer_notes || '',
    payment_method: initialData?.payment_method || '',
    paid: initialData?.paid || false,
    channel: initialData?.channel || 'phone',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>(
    initialData?.order_items?.map(item => ({
      product_name: item.product_name,
      product_image_urls: [],
      quantity: item.quantity,
      unit_price: item.unit_price,
      selected_flavour: item.selected_flavour || null,
      flavour_name: item.flavour_name || null,
      weight_kg: item.weight_kg || null,
      diameter_cm: item.diameter_cm || null,
      writing_on_cake: item.writing_on_cake || null,
      internal_decoration_notes: item.internal_decoration_notes || null,
      staff_notes: item.staff_notes || null,
    })) || []
  );

  // Fetch flavours on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const flavoursData = await getFlavours('en');
        setFlavours(flavoursData || []);
      } catch (error) {
        console.error('Error fetching flavours:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
    fetchData();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    // Save original overflow style
    const originalOverflow = document.body.style.overflow;
    
    // Prevent scrolling
    document.body.style.overflow = 'hidden';
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleClientSelect = (client: any) => {
    setSelectedClient(client);
    // Pre-fill form with client data
    setFormData(prev => ({
      ...prev,
      customer_name: client.name,
      customer_email: client.email || '',
      customer_phone: client.phone || '',
      customer_ig_handle: client.instagramHandle || '',
      // Infer channel from preferred contact
      channel: client.preferredContact === 'instagram' ? 'instagram' :
               client.preferredContact === 'email' ? 'email' :
               client.preferredContact === 'whatsapp' ? 'whatsapp' :
               'phone',
    }));
  };

  const handleClearClientSelection = () => {
    setSelectedClient(null);
    // Clear customer fields
    setFormData(prev => ({
      ...prev,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_ig_handle: '',
    }));
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      product_name: '',
      product_image_urls: [],
      quantity: 1,
      unit_price: 0,
      selected_flavour: null,
      flavour_name: null,
      weight_kg: null,
      diameter_cm: null,
      writing_on_cake: null,
      internal_decoration_notes: null,
      staff_notes: null,
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: any) => {
    setOrderItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      // If flavour changes, update flavour_name
      if (field === 'selected_flavour') {
        if (value === 'custom') {
          // Custom flavour selected - keep the ID but clear the name for manual entry
          return {
            ...item,
            selected_flavour: 'custom',
            flavour_name: null,
          };
        } else {
          // Standard flavour selected from list
          const flavour = flavours.find(f => f._id === value);
          return {
            ...item,
            selected_flavour: value,
            flavour_name: flavour?.name || null,
          };
        }
      }
      
      return { ...item, [field]: value };
    }));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  // Step validation
  const isStep1Valid = () => {
    // Only customer name is required
    return formData.customer_name.trim() !== '';
  };

  const isStep2Valid = () => {
    if (orderItems.length === 0) return false;
    return orderItems.every(item => item.product_name.trim() && item.unit_price > 0);
  };

  const isStep3Valid = () => {
    return deliveryDate !== undefined;
  };

  const canNavigateToStep = (step: Step) => {
    // Allow free navigation between all steps
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && isStep2Valid()) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const getCustomerSummary = () => {
    if (!formData.customer_name) return 'Нет информации о клиенте';
    return formData.customer_name;
  };

  const getItemsSummary = () => {
    if (orderItems.length === 0) return 'Нет позиций';
    const itemWord = orderItems.length === 1 ? 'позиция' : orderItems.length < 5 ? 'позиции' : 'позиций';
    return `${orderItems.length} ${itemWord} • CHF ${calculateTotal().toFixed(2)}`;
  };

  const getDeliverySummary = () => {
    if (!deliveryDate) return t.deliveryDate;
    const date = deliveryDate.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
    return `${date} • ${formData.delivery_type === 'pickup' ? t.pickup : t.delivery}`;
  };

  // Check if form has data
  const hasFormData = () => {
    const hasCustomerData = formData.customer_name.trim() || 
                           formData.customer_email.trim() || 
                           formData.customer_phone.trim();
    const hasItems = orderItems.length > 0;
    return hasCustomerData || hasItems || deliveryDate !== undefined;
  };

  // Handle close with confirmation
  const handleClose = () => {
    if (hasFormData()) {
      if (confirm('У вас есть несохраненные изменения. Вы уверены, что хотите закрыть? Все данные будут потеряны.')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle AI-extracted data
  const handleAIDataExtracted = (data: AIExtractedOrderData) => {
    // Pre-fill form data
    if (data.customer_name) setFormData(prev => ({ ...prev, customer_name: data.customer_name! }));
    if (data.customer_email) setFormData(prev => ({ ...prev, customer_email: data.customer_email! }));
    if (data.customer_phone) setFormData(prev => ({ ...prev, customer_phone: data.customer_phone! }));
    if (data.customer_ig_handle) setFormData(prev => ({ ...prev, customer_ig_handle: data.customer_ig_handle! }));
    if (data.delivery_type) setFormData(prev => ({ ...prev, delivery_type: data.delivery_type! }));
    if (data.delivery_time) setFormData(prev => ({ ...prev, delivery_time: data.delivery_time! }));
    if (data.delivery_address) setFormData(prev => ({ ...prev, delivery_address: data.delivery_address! }));
    if (data.customer_notes) setFormData(prev => ({ ...prev, customer_notes: data.customer_notes! }));
    if (data.payment_method) setFormData(prev => ({ ...prev, payment_method: data.payment_method! }));
    if (data.paid !== undefined) setFormData(prev => ({ ...prev, paid: data.paid! }));
    if (data.channel) setFormData(prev => ({ ...prev, channel: data.channel! }));
    
    // Set delivery date
    if (data.delivery_date) {
      setDeliveryDate(new Date(data.delivery_date));
    }
    
    // Pre-fill order items
    if (data.order_items && data.order_items.length > 0) {
      setOrderItems(data.order_items.map(item => ({
        product_name: item.product_name,
        product_image_urls: [],
        quantity: item.quantity,
        unit_price: item.unit_price,
        selected_flavour: item.selected_flavour || null,
        flavour_name: item.flavour_name || null,
        weight_kg: item.weight_kg || null,
        diameter_cm: item.diameter_cm || null,
        writing_on_cake: item.writing_on_cake || null,
        internal_decoration_notes: item.internal_decoration_notes || null,
        staff_notes: item.staff_notes || null,
      })));
    }
    
    setIsAIPrefilled(true);
    setShowAIModal(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!deliveryDate) {
      alert(t.pleaseSelectDeliveryDate);
      return;
    }
    
    if (orderItems.length === 0) {
      alert(t.pleaseAddAtLeastOneItem);
      return;
    }

    // Validate that all items have a name and price
    const hasInvalidItems = orderItems.some(item => !item.product_name.trim() || item.unit_price <= 0);
    if (hasInvalidItems) {
      alert(t.pleaseEnsureItemsValid);
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      
      // Format delivery date to YYYY-MM-DD in local timezone (prevents timezone shift bug)
      const formattedDate = formatDateForDB(deliveryDate);
      
      // Build delivery address JSONB object
      const deliveryAddressObj = formData.delivery_type === 'delivery' && formData.delivery_address
        ? {
            street: formData.delivery_address,
            city: '',
            postalCode: '',
            country: 'Switzerland'
          }
        : null;
      
      const payload = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_ig_handle: formData.customer_ig_handle,
        delivery_date: formattedDate,
        delivery_time: formData.delivery_time || null,
        delivery_type: formData.delivery_type,
        delivery_address: deliveryAddressObj,
        customer_notes: formData.customer_notes,
        payment_method: formData.payment_method,
        paid: formData.paid,
        channel: formData.channel,
        total_amount: totalAmount,
        is_immediate: false, // Not an immediate order
        order_items: orderItems.map(item => ({
          ...item,
          product_id: null, // Custom orders don't have a product_id
          subtotal: item.unit_price * item.quantity
        })),
      };
      
      console.log('Creating order with payload:', payload);
      
      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        let errorMessage = error.error || t.failedToCreateOrder;
        
        // Show detailed missing fields if available
        if (error.missingFields && error.missingFields.length > 0) {
          errorMessage += '\n\n' + t.missingFields + ':\n' + error.missingFields.map((field: string) => `• ${field}`).join('\n');
        }
        
        throw new Error(errorMessage);
      }

      // Success - refresh and close
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error instanceof Error ? error.message : t.failedToCreateOrder + '. ' + t.tryAgain);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Modal Header with Step Navigation */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 text-white flex-shrink-0">
          {/* Top Bar */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/20">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-heading font-bold">
                Создать индивидуальный заказ
              </h2>
              {isAIPrefilled && (
                <span className="px-3 py-1 bg-purple-500/30 text-white text-xs font-bold rounded-full uppercase tracking-wide flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Заполнено ИИ
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* AI Assistant */}
              <button
                onClick={() => setShowAIModal(true)}
                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg"
                title="Помощник заказов с ИИ"
              >
                <Lightbulb className="w-5 h-5" />
              </button>
              
              {/* Close Button */}
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                title="Закрыть"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Step Navigation */}
          <div className="grid grid-cols-3 gap-2 px-6 py-4">
            {/* Step 1: Customer */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 1
                  ? 'bg-white/20 ring-2 ring-white'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  1
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Клиент</p>
              </div>
              <p className={`text-sm ${currentStep === 1 ? 'text-white' : 'text-white/70'} truncate`}>
                {getCustomerSummary()}
              </p>
            </button>

            {/* Step 2: Items */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 2
                  ? 'bg-white/20 ring-2 ring-white'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 2 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  2
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Позиции</p>
              </div>
              <p className={`text-sm ${currentStep === 2 ? 'text-white' : 'text-white/70'} truncate`}>
                {getItemsSummary()}
              </p>
            </button>

            {/* Step 3: Delivery */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 3
                  ? 'bg-white/20 ring-2 ring-white'
                  : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 3 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  3
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Доставка</p>
              </div>
              <p className={`text-sm ${currentStep === 3 ? 'text-white' : 'text-white/70'} truncate`}>
                {getDeliverySummary()}
              </p>
            </button>
          </div>
        </div>

        {/* Modal Body - Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Customer Information */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">Информация о клиенте</h3>
                <p className="text-charcoal-600">Для кого этот заказ?</p>
              </div>

              {/* Client Search/Select */}
              <div className="mb-6">
                <ClientSearchInput
                  onClientSelect={handleClientSelect}
                  onCreateNew={handleClearClientSelection}
                />
              </div>
                
              {/* Selected Client Info */}
              {selectedClient && (
                <div className="mb-6 p-4 bg-white border-2 border-brown-300 rounded-lg shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-brown-600" />
                          <p className="font-bold text-brown-800 text-lg">
                            {selectedClient.name}
                          </p>
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
                              {selectedClient.lastOrderDate && (
                                <>
                                  <span>•</span>
                                  <span>Последний: {new Date(selectedClient.lastOrderDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleClearClientSelection}
                        className="px-3 py-1.5 text-sm text-charcoal-600 hover:text-charcoal-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                      >
                        Очистить
                      </button>
                    </div>
                  </div>
                )}

              <div className="space-y-4">
                {/* Customer Name & Contact Details Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Name */}
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Имя клиента <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleChange}
                      placeholder="Полное имя"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>

                  {/* Conditional Contact Field */}
                  {(formData.channel === 'phone' || formData.channel === 'whatsapp' || formData.channel === 'walk_in') && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Номер телефона
                      </label>
                      <input
                        type="tel"
                        name="customer_phone"
                        value={formData.customer_phone}
                        onChange={handleChange}
                        placeholder="+41 XX XXX XX XX (необязательно)"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {formData.channel === 'instagram' && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Instagram аккаунт
                      </label>
                      <input
                        type="text"
                        name="customer_ig_handle"
                        value={formData.customer_ig_handle}
                        onChange={handleChange}
                        placeholder="@username (необязательно)"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {formData.channel === 'email' && (
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Электронная почта
                      </label>
                      <input
                        type="email"
                        name="customer_email"
                        value={formData.customer_email}
                        onChange={handleChange}
                        placeholder="customer@example.com (необязательно)"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Order Channel Buttons */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-3">
                    Канал заказа
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {/* Phone */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: 'phone' }))}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        formData.channel === 'phone'
                          ? 'bg-brown-500 border-brown-500 text-white shadow-lg scale-105'
                          : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300 hover:bg-cream-50'
                      }`}
                    >
                      <Phone className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">Телефон</span>
                    </button>

                    {/* WhatsApp */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: 'whatsapp' }))}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        formData.channel === 'whatsapp'
                          ? 'bg-brown-500 border-brown-500 text-white shadow-lg scale-105'
                          : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300 hover:bg-cream-50'
                      }`}
                    >
                      <MessageCircle className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">ВатсАпп</span>
                    </button>

                    {/* Instagram */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: 'instagram' }))}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        formData.channel === 'instagram'
                          ? 'bg-brown-500 border-brown-500 text-white shadow-lg scale-105'
                          : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300 hover:bg-cream-50'
                      }`}
                    >
                      <Camera className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">Инстаграм</span>
                    </button>

                    {/* Email */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: 'email' }))}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        formData.channel === 'email'
                          ? 'bg-brown-500 border-brown-500 text-white shadow-lg scale-105'
                          : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300 hover:bg-cream-50'
                      }`}
                    >
                      <Mail className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">Почта</span>
                    </button>

                    {/* Walk-in */}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, channel: 'walk_in' }))}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        formData.channel === 'walk_in'
                          ? 'bg-brown-500 border-brown-500 text-white shadow-lg scale-105'
                          : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300 hover:bg-cream-50'
                      }`}
                    >
                      <User className="w-8 h-8 mb-2" />
                      <span className="text-xs font-semibold">В магазине</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Order Items */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">Позиции заказа</h3>
                  <p className="text-charcoal-600">Добавьте продукты в этот заказ</p>
                </div>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="px-5 py-2.5 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Добавить позицию
                </button>
              </div>

              {orderItems.length === 0 ? (
                <div className="bg-cream-50 border-2 border-dashed border-cream-300 rounded-2xl p-12 text-center">
                  <Package className="w-16 h-16 mx-auto text-charcoal-300 mb-4" />
                  <p className="text-lg font-semibold text-charcoal-600 mb-2">Позиции ещё не добавлены</p>
                  <p className="text-sm text-charcoal-500">Нажмите "Добавить позицию", чтобы начать формирование заказа</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={index} className="border-2 border-cream-300 rounded-xl p-4 bg-cream-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-charcoal-900">Позиция №{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Удалить
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Product Name */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Название продукта <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => updateOrderItem(index, 'product_name', e.target.value)}
                            required
                            placeholder="напр., Шоколадный торт на день рождения"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Цена за единицу (CHF) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateOrderItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            required
                            placeholder="0.00"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Количество <span className="text-red-500">*</span>
                  </label>
                  <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Flavour */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Вкус
                          </label>
                          <select
                            value={item.selected_flavour || ''}
                            onChange={(e) => updateOrderItem(index, 'selected_flavour', e.target.value || null)}
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          >
                            <option value="">Без вкуса</option>
                            {flavours.map(flavour => (
                              <option key={flavour._id} value={flavour._id}>
                                {flavour.name}
                              </option>
                            ))}
                            <option value="custom">Свой вкус (указать вручную)</option>
                          </select>
                        </div>

                        {/* Custom Flavour Input - appears when "custom" is selected */}
                        {item.selected_flavour === 'custom' && (
                          <div className="md:col-span-3">
                            <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                              Название вкуса <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={item.flavour_name || ''}
                              onChange={(e) => updateOrderItem(index, 'flavour_name', e.target.value || null)}
                              placeholder="напр., Малина-фисташка"
                              className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                            />
                          </div>
                        )}

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Вес (кг)
                          </label>
                          <input
                            type="text"
                            value={item.weight_kg || ''}
                            onChange={(e) => updateOrderItem(index, 'weight_kg', e.target.value ? e.target.value : null)}
                            placeholder="напр., 1.5 или 1.5 кг"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Diameter */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Диаметр (см)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.diameter_cm || ''}
                            onChange={(e) => updateOrderItem(index, 'diameter_cm', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="напр., 20"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Product Images */}
                        <div className="md:col-span-3">
                          <MultiImageUpload
                            value={item.product_image_urls || []}
                            onChange={(urls) => updateOrderItem(index, 'product_image_urls', urls)}
                            label={t.productImageOptional}
                          />
                        </div>

                        {/* Writing on Cake */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            {t.writingOnCake}
                          </label>
                          <input
                            type="text"
                            value={item.writing_on_cake || ''}
                            onChange={(e) => updateOrderItem(index, 'writing_on_cake', e.target.value || null)}
                            placeholder="напр., С Днём Рождения!"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Internal Decoration Notes */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            {t.internalDecorationNotes}
                          </label>
                          <textarea
                            value={item.internal_decoration_notes || ''}
                            onChange={(e) => updateOrderItem(index, 'internal_decoration_notes', e.target.value || null)}
                            rows={2}
                            placeholder="Заметки для команды декораторов..."
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Staff Notes */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            {t.staffNotes}
                          </label>
                          <textarea
                            value={item.staff_notes || ''}
                            onChange={(e) => updateOrderItem(index, 'staff_notes', e.target.value || null)}
                            rows={2}
                            placeholder="Общие заметки персонала..."
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="md:col-span-3 pt-2 border-t-2 border-cream-300">
                          <p className="text-right font-bold text-charcoal-900">
                            Подытог: CHF {(item.unit_price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Delivery & Details */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">
                  Доставка и детали
                </h3>
                <p className="text-charcoal-600">
                  Когда и как доставить?
                </p>
              </div>

              {/* Delivery Date & Type */}
              <div>
                <h4 className="font-heading font-bold text-charcoal-900 mb-4">{t.deliveryInformation}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <DatePicker
                        selectedDate={deliveryDate}
                        onDateChange={setDeliveryDate}
                        locale="ru"
                        required
                        minDate={new Date()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      {t.deliveryType} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="delivery_type"
                      value={formData.delivery_type}
                      onChange={handleChange}
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
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleChange}
                    placeholder="напр. 14:30, после обеда, 14:00-16:00"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>

                {formData.delivery_type === 'delivery' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      {t.deliveryAddress}
                    </label>
                    <input
                      type="text"
                      name="delivery_address"
                      value={formData.delivery_address}
                      onChange={handleChange}
                      placeholder="напр., ул. Bahnhofstrasse 10, Цюрих 8001"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                    <p className="text-xs text-charcoal-500 mt-1">
                      Введите полный адрес: улица, город, индекс
                    </p>
                  </div>
                )}
              </div>
            </div>

              {/* Payment & Notes */}
            <div>
                <h4 className="font-heading font-bold text-charcoal-900 mb-4">
                  Оплата и заметки
                </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Способ оплаты
                    </label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    >
                      <option value="">Не указано</option>
                      <option value="cash">💵 Наличные</option>
                      <option value="twint">💳 Twint</option>
                      <option value="stripe">💳 Карта (Stripe)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-8">
                    <input
                      type="checkbox"
                      name="paid"
                      id="paid"
                      checked={formData.paid}
                      onChange={handleChange}
                      className="w-5 h-5 rounded border-2 border-cream-300 text-brown-500 focus:ring-brown-500"
                    />
                    <label htmlFor="paid" className="ml-3 text-sm font-semibold text-charcoal-700">
                      ✓ Отметить как оплаченный
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Заметки клиента
                    </label>
                    <textarea
                      name="customer_notes"
                      value={formData.customer_notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Инструкции по доставке, особые пожелания, аллергии..."
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
            </div>
          </div>
            </div>
          )}
        </div>

        {/* Modal Footer - Step Navigation */}
        <div className="bg-cream-50 border-t-2 border-cream-200 p-6 flex justify-between items-center flex-shrink-0">
          {/* Left: Previous Button or Cancel */}
          <div>
            {currentStep === 1 ? (
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300"
          >
            Отмена
          </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300 flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                Назад
              </button>
            )}
          </div>

          {/* Center: Order Summary */}
          <div className="text-center">
            <p className="text-sm text-charcoal-600">Итого по заказу</p>
            <p className="text-2xl font-bold text-brown-500">CHF {calculateTotal().toFixed(2)}</p>
          </div>

          {/* Right: Next Button or Create */}
          <div>
            {currentStep < 3 ? (
          <button
                type="button"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && !isStep1Valid()) ||
                  (currentStep === 2 && !isStep2Valid())
                }
                className={`px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  (currentStep === 1 && !isStep1Valid()) || (currentStep === 2 && !isStep2Valid())
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-brown-500 text-white hover:bg-brown-600'
            }`}
          >
                Продолжить
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !isStep3Valid()}
                className={`px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  isSubmitting || !isStep3Valid()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-brown-500 text-white hover:bg-brown-600'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Создание...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Создать заказ
                  </>
                )}
          </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Order Assistant Modal */}
      {showAIModal && (
        <AIOrderAssistantModal
          onClose={() => setShowAIModal(false)}
          onOrderExtracted={handleAIDataExtracted}
        />
      )}
    </div>
  );
}
