'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFlavours } from '@/lib/sanity/queries';
import DatePicker from '@/components/products/DatePicker';
import ImageUpload from '@/components/admin/ImageUpload';

interface CreateOrderModalProps {
  onClose: () => void;
}

interface OrderItem {
  product_name: string;
  product_image_url: string;
  quantity: number;
  unit_price: number;
  selected_flavour: string | null;
  flavour_name: string | null;
  weight_kg: number | null;
  diameter_cm: number | null;
  writing_on_cake: string | null;
  internal_decoration_notes: string | null;
  staff_notes: string | null;
}

type Step = 1 | 2 | 3;

export default function CreateOrderModal({ onClose }: CreateOrderModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flavours, setFlavours] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [deliveryDate, setDeliveryDate] = useState<Date | undefined>(undefined);
  
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_ig_handle: '',
    delivery_type: 'pickup',
    delivery_time: '',
    delivery_address: '',
    delivery_city: '',
    delivery_postal_code: '',
    delivery_country: 'Switzerland',
    customer_notes: '',
    payment_method: 'cash',
    paid: false,
    channel: 'phone',
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      product_name: '',
      product_image_url: '',
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
        const flavour = flavours.find(f => f._id === value);
        return {
          ...item,
          selected_flavour: value,
          flavour_name: flavour?.name || null,
        };
      }
      
      return { ...item, [field]: value };
    }));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  };

  // Step validation
  const isStep1Valid = () => {
    if (!formData.customer_name.trim()) return false;
    if (formData.channel === 'phone' || formData.channel === 'whatsapp' || formData.channel === 'walk_in') {
      return formData.customer_phone.trim() !== '';
    }
    if (formData.channel === 'instagram') {
      return formData.customer_ig_handle.trim() !== '';
    }
    if (formData.channel === 'email') {
      return formData.customer_email.trim() !== '';
    }
    return true;
  };

  const isStep2Valid = () => {
    if (orderItems.length === 0) return false;
    return orderItems.every(item => item.product_name.trim() && item.unit_price > 0);
  };

  const isStep3Valid = () => {
    return deliveryDate !== undefined;
  };

  const canNavigateToStep = (step: Step) => {
    if (step === 1) return true;
    if (step === 2) return isStep1Valid();
    if (step === 3) return isStep1Valid() && isStep2Valid();
    return false;
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
    if (!formData.customer_name) return 'No customer info';
    return formData.customer_name;
  };

  const getItemsSummary = () => {
    if (orderItems.length === 0) return 'No items';
    return `${orderItems.length} item${orderItems.length > 1 ? 's' : ''} • CHF ${calculateTotal().toFixed(2)}`;
  };

  const getDeliverySummary = () => {
    if (!deliveryDate) return 'No delivery date';
    const date = deliveryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${date} • ${formData.delivery_type === 'pickup' ? 'Pickup' : 'Delivery'}`;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!deliveryDate) {
      alert('Please select a delivery date');
      return;
    }
    
    if (orderItems.length === 0) {
      alert('Please add at least one order item');
      return;
    }

    // Validate that all items have a name and price
    const hasInvalidItems = orderItems.some(item => !item.product_name.trim() || item.unit_price <= 0);
    if (hasInvalidItems) {
      alert('Please ensure all items have a name and a valid price');
      return;
    }

    setIsSubmitting(true);

    try {
      const totalAmount = calculateTotal();
      
      // Format delivery date to YYYY-MM-DD
      const formattedDate = deliveryDate.toISOString().split('T')[0];
      
      // Build delivery address JSONB object
      const deliveryAddressObj = formData.delivery_type === 'delivery' && formData.delivery_address
        ? {
            street: formData.delivery_address,
            city: formData.delivery_city || '',
            postalCode: formData.delivery_postal_code || '',
            country: formData.delivery_country || 'Switzerland'
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
        let errorMessage = error.error || 'Failed to create order';
        
        // Show detailed missing fields if available
        if (error.missingFields && error.missingFields.length > 0) {
          errorMessage += '\n\nMissing fields:\n' + error.missingFields.map((field: string) => `• ${field}`).join('\n');
        }
        
        throw new Error(errorMessage);
      }

      // Success - refresh and close
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error instanceof Error ? error.message : 'Failed to create order. Please try again.');
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
            <h2 className="text-2xl font-heading font-bold">Create Custom Order</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

          {/* Step Navigation */}
          <div className="grid grid-cols-3 gap-2 px-6 py-4">
            {/* Step 1: Customer */}
            <button
              type="button"
              onClick={() => canNavigateToStep(1) && setCurrentStep(1)}
              disabled={!canNavigateToStep(1)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 1
                  ? 'bg-white/20 ring-2 ring-white'
                  : canNavigateToStep(1)
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 1 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  1
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Customer</p>
              </div>
              <p className={`text-sm ${currentStep === 1 ? 'text-white' : 'text-white/70'} truncate`}>
                {getCustomerSummary()}
              </p>
            </button>

            {/* Step 2: Items */}
            <button
              type="button"
              onClick={() => canNavigateToStep(2) && setCurrentStep(2)}
              disabled={!canNavigateToStep(2)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 2
                  ? 'bg-white/20 ring-2 ring-white'
                  : canNavigateToStep(2)
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 2 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  2
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Items</p>
              </div>
              <p className={`text-sm ${currentStep === 2 ? 'text-white' : 'text-white/70'} truncate`}>
                {getItemsSummary()}
              </p>
            </button>

            {/* Step 3: Delivery */}
            <button
              type="button"
              onClick={() => canNavigateToStep(3) && setCurrentStep(3)}
              disabled={!canNavigateToStep(3)}
              className={`text-left p-3 rounded-xl transition-all ${
                currentStep === 3
                  ? 'bg-white/20 ring-2 ring-white'
                  : canNavigateToStep(3)
                  ? 'bg-white/10 hover:bg-white/15'
                  : 'bg-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep === 3 ? 'bg-white text-brown-500' : 'bg-white/30'
                }`}>
                  3
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">Delivery</p>
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
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">Customer Information</h3>
                <p className="text-charcoal-600">Who is this order for?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleChange}
                    placeholder="Full name"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>

                {/* Order Channel */}
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    Order Channel <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="channel"
                    value={formData.channel}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                    <option value="phone">📞 Phone</option>
                    <option value="whatsapp">💬 WhatsApp</option>
                    <option value="instagram">📸 Instagram</option>
                    <option value="email">📧 Email</option>
                    <option value="walk_in">🚶 Walk-in</option>
                  </select>
                </div>

                {/* Conditional Contact Field */}
                {(formData.channel === 'phone' || formData.channel === 'whatsapp' || formData.channel === 'walk_in') && (
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                      placeholder="+41 XX XXX XX XX"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                )}

                {formData.channel === 'instagram' && (
                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Instagram Handle <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_ig_handle"
                    value={formData.customer_ig_handle}
                    onChange={handleChange}
                    placeholder="@username"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>
                )}

                {formData.channel === 'email' && (
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleChange}
                      placeholder="customer@example.com"
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Order Items */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">Order Items</h3>
                  <p className="text-charcoal-600">Add products to this order</p>
                </div>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="px-5 py-2.5 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              {orderItems.length === 0 ? (
                <div className="bg-cream-50 border-2 border-dashed border-cream-300 rounded-2xl p-12 text-center">
                  <svg className="w-16 h-16 mx-auto text-charcoal-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <p className="text-lg font-semibold text-charcoal-600 mb-2">No items added yet</p>
                  <p className="text-sm text-charcoal-500">Click "Add Item" to start building the order</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div key={index} className="border-2 border-cream-300 rounded-xl p-4 bg-cream-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-charcoal-900">Item #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeOrderItem(index)}
                          className="text-red-500 hover:text-red-700 font-semibold text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Product Name */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.product_name}
                            onChange={(e) => updateOrderItem(index, 'product_name', e.target.value)}
                            required
                            placeholder="e.g., Chocolate Birthday Cake"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Unit Price */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Unit Price (CHF) <span className="text-red-500">*</span>
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
                            Quantity <span className="text-red-500">*</span>
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
                            Flavour
                          </label>
                          <select
                            value={item.selected_flavour || ''}
                            onChange={(e) => updateOrderItem(index, 'selected_flavour', e.target.value || null)}
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          >
                            <option value="">No flavour</option>
                            {flavours.map(flavour => (
                              <option key={flavour._id} value={flavour._id}>
                                {flavour.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Weight */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Weight (kg)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={item.weight_kg || ''}
                            onChange={(e) => updateOrderItem(index, 'weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="e.g., 1.5"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Diameter */}
                        <div>
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Diameter (cm)
                          </label>
                          <input
                            type="number"
                            step="1"
                            min="0"
                            value={item.diameter_cm || ''}
                            onChange={(e) => updateOrderItem(index, 'diameter_cm', e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="e.g., 20"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Product Image */}
                        <div className="md:col-span-3">
                          <ImageUpload
                            value={item.product_image_url || ''}
                            onChange={(url) => updateOrderItem(index, 'product_image_url', url)}
                            label="Product Image (optional)"
                          />
                        </div>

                        {/* Writing on Cake */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Writing on Cake
                          </label>
                          <input
                            type="text"
                            value={item.writing_on_cake || ''}
                            onChange={(e) => updateOrderItem(index, 'writing_on_cake', e.target.value || null)}
                            placeholder="e.g., Happy Birthday!"
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Internal Decoration Notes */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Internal Decoration Notes (Staff)
                          </label>
                          <textarea
                            value={item.internal_decoration_notes || ''}
                            onChange={(e) => updateOrderItem(index, 'internal_decoration_notes', e.target.value || null)}
                            rows={2}
                            placeholder="Notes for decorating team..."
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Staff Notes */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                            Staff Notes
                          </label>
                          <textarea
                            value={item.staff_notes || ''}
                            onChange={(e) => updateOrderItem(index, 'staff_notes', e.target.value || null)}
                            rows={2}
                            placeholder="General staff notes..."
                            className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                          />
                        </div>

                        {/* Subtotal */}
                        <div className="md:col-span-3 pt-2 border-t-2 border-cream-300">
                          <p className="text-right font-bold text-charcoal-900">
                            Subtotal: CHF {(item.unit_price * item.quantity).toFixed(2)}
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
                <h3 className="text-2xl font-heading font-bold text-brown-500 mb-2">Delivery & Details</h3>
                <p className="text-charcoal-600">When and how should we deliver?</p>
              </div>

              {/* Delivery Date & Type */}
              <div>
                <h4 className="font-heading font-bold text-charcoal-900 mb-4">Delivery Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <DatePicker
                      selectedDate={deliveryDate}
                      onDateChange={setDeliveryDate}
                      locale="en"
                      required
                      minDate={new Date()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    Delivery Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="delivery_type"
                    value={formData.delivery_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  >
                      <option value="pickup">🏪 Pickup</option>
                      <option value="delivery">🚗 Delivery</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                    Delivery/Pickup Time <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleChange}
                    placeholder="e.g. 14:30, afternoon, 2-4pm"
                    className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                  />
                </div>

                {formData.delivery_type === 'delivery' && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Delivery Address
                      </label>
                      <input
                        type="text"
                        name="delivery_address"
                        value={formData.delivery_address}
                        onChange={handleChange}
                          placeholder="Street address"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        name="delivery_city"
                        value={formData.delivery_city}
                        onChange={handleChange}
                          placeholder="City"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        name="delivery_postal_code"
                        value={formData.delivery_postal_code}
                        onChange={handleChange}
                          placeholder="Postal code"
                        className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

              {/* Payment & Notes */}
            <div>
                <h4 className="font-heading font-bold text-charcoal-900 mb-4">Payment & Notes</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="payment_method"
                      value={formData.payment_method}
                      onChange={handleChange}
                      className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                    >
                      <option value="cash">💵 Cash</option>
                      <option value="twint">💳 Twint</option>
                      <option value="stripe">💳 Card (Stripe)</option>
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
                      ✓ Mark as Paid
                  </label>
              </div>

                  <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                  Customer Notes
                </label>
                <textarea
                  name="customer_notes"
                  value={formData.customer_notes}
                  onChange={handleChange}
                  rows={3}
                      placeholder="Delivery instructions, special requests, allergies..."
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
            onClick={onClose}
            className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300"
          >
            Cancel
          </button>
            ) : (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-6 py-3 bg-white text-charcoal-700 rounded-xl font-semibold hover:bg-cream-100 transition-colors border-2 border-cream-300 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
          </div>

          {/* Center: Order Summary */}
          <div className="text-center">
            <p className="text-sm text-charcoal-600">Order Total</p>
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
                Continue
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !isStep3Valid()}
                className={`px-8 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2 ${
                  isSubmitting || !isStep3Valid()
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Order
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
