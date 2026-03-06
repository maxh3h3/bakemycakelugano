'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useCartStore } from '@/store/cart-store';
import { formatPrice, formatDateForDB } from '@/lib/utils';
import { type DeliveryInfo, LUGANO_ZIP_CODES, LUGANO_DELIVERY_FEE } from '@/lib/delivery';
import Button from '@/components/ui/Button';
import OrderSummary from './OrderSummary';
import DatePicker from '@/components/products/DatePicker';

interface CheckoutFormProps {
  locale: string;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  deliveryType: 'pickup' | 'delivery';
  deliveryDate?: Date;
  deliveryTime: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  specialInstructions: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  deliveryDate?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export default function CheckoutForm({ locale }: CheckoutFormProps) {
  const t = useTranslations('checkout');
  const router = useRouter();
  const { items, getTotalPrice } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo>({
    isLuganoArea: true,
    deliveryFee: 0,
    requiresContact: false,
  });
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);
  const deliveryEstimateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    deliveryType: 'pickup',
    deliveryDate: undefined,
    deliveryTime: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'Switzerland',
    specialInstructions: '',
  });

  // Check if selected date is Sunday
  const isSunday = formData.deliveryDate ? formData.deliveryDate.getDay() === 0 : false;

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push(`/${locale}/cart`);
    }
  }, [items, locale, router]);

  // Calculate delivery fee — fast path for known Lugano zip codes, Maps API for everything else
  useEffect(() => {
    if (formData.deliveryType === 'pickup') {
      setDeliveryInfo({ isLuganoArea: true, deliveryFee: 0, requiresContact: false });
      return;
    }

    const { address, city, postalCode, country } = formData;

    if (!postalCode.trim()) {
      setDeliveryInfo({ isLuganoArea: true, deliveryFee: 0, requiresContact: false });
      return;
    }

    // Fast path: known Lugano zip code → flat CHF 20, no API call
    if (LUGANO_ZIP_CODES.includes(postalCode.trim())) {
      setDeliveryInfo({ isLuganoArea: true, deliveryFee: LUGANO_DELIVERY_FEE, requiresContact: false });
      return;
    }

    // Outside Lugano: need full address for Maps API
    if (!address.trim() || !city.trim()) {
      setDeliveryInfo({ isLuganoArea: false, deliveryFee: 0, requiresContact: false });
      return;
    }

    if (deliveryEstimateTimerRef.current) {
      clearTimeout(deliveryEstimateTimerRef.current);
    }

    deliveryEstimateTimerRef.current = setTimeout(async () => {
      setIsCalculatingDelivery(true);
      try {
        const response = await fetch('/api/delivery-estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address, city, postalCode, country }),
        });
        if (!response.ok) throw new Error('Failed to estimate delivery');
        const data = await response.json();
        setDeliveryInfo({
          isLuganoArea: false,
          deliveryFee: data.fee,
          requiresContact: data.requiresContact,
          distanceKm: data.distanceKm,
          durationMinutes: data.durationMinutes,
        });
      } catch {
        setDeliveryInfo({ isLuganoArea: false, deliveryFee: 0, requiresContact: true });
      } finally {
        setIsCalculatingDelivery(false);
      }
    }, 600);

    return () => {
      if (deliveryEstimateTimerRef.current) {
        clearTimeout(deliveryEstimateTimerRef.current);
      }
    };
  }, [formData.address, formData.city, formData.postalCode, formData.deliveryType, formData.country]);

  // Automatically switch to delivery if Sunday is selected and pickup was chosen
  useEffect(() => {
    if (isSunday && formData.deliveryType === 'pickup') {
      setFormData(prev => ({ ...prev, deliveryType: 'delivery' }));
    }
  }, [isSunday, formData.deliveryType]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('nameRequired');
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = t('emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('emailInvalid');
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = t('phoneRequired');
    }

    // Delivery date validation
    if (!formData.deliveryDate) {
      newErrors.deliveryDate = t('deliveryDateRequired');
    }

    // Delivery-specific validation
    if (formData.deliveryType === 'delivery') {
      if (!formData.address.trim()) {
        newErrors.address = t('addressRequired');
      }
      if (!formData.city.trim()) {
        newErrors.city = t('cityRequired');
      }
      if (!formData.postalCode.trim()) {
        newErrors.postalCode = t('postalCodeRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare cart items for checkout
      const checkoutItems = items.map(item => ({
        productId: item.product._id,
        productName: item.product.name,
        productImageUrl: item.product.images?.[0] ? item.product.images[0] : null,
        quantity: item.quantity,
        unitPrice: useCartStore.getState().getItemPrice(item),
        weight_kg: item.weight_kg || null,
        selectedFlavour: item.selectedFlavour || null,
        flavourName: item.selectedFlavour
          ? item.product.availableFlavours?.find(f => f._id === item.selectedFlavour)?.name || null
          : null,
        writingOnCake: item.writingOnCake || null,
      }));

      // Call API to create checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerInfo: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
          },
          deliveryInfo: {
            type: formData.deliveryType,
            date: formData.deliveryDate 
              ? formatDateForDB(formData.deliveryDate)
              : null,
            time: formData.deliveryTime || null,
            address: formData.deliveryType === 'delivery' ? formData.address : null,
            city: formData.deliveryType === 'delivery' ? formData.city : null,
            postalCode: formData.deliveryType === 'delivery' ? formData.postalCode : null,
            country: formData.deliveryType === 'delivery' ? formData.country : null,
            fee: deliveryInfo.deliveryFee,
            requiresContact: deliveryInfo.requiresContact,
          },
          specialInstructions: formData.specialInstructions || null,
          items: checkoutItems,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = sessionUrl;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(t('checkoutError'));
      setIsProcessing(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (items.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-cream-200">
            <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
              {t('customerInfo')}
            </h2>
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-charcoal-900 mb-1">
                  {t('name')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder={t('namePlaceholder')}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.name
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-cream-200 focus:border-brown-500'
                  } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                />
                {errors.name && (
                  <p className="text-xs text-rose-500 mt-1">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-charcoal-900 mb-1">
                  {t('email')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={t('emailPlaceholder')}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.email
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-cream-200 focus:border-brown-500'
                  } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                />
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-charcoal-900 mb-1">
                  {t('phone')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder={t('phonePlaceholder')}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.phone
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-cream-200 focus:border-brown-500'
                  } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                />
                {errors.phone && (
                  <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Information */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-cream-200">
            <h2 className="font-heading text-2xl font-bold text-charcoal-900 mb-6">
              {t('deliveryInfo')}
            </h2>
            <div className="space-y-4">
              {/* Delivery/Pickup Date - NOW FIRST */}
              <div>
                <DatePicker
                  selectedDate={formData.deliveryDate}
                  onDateChange={(date) => {
                    setFormData(prev => ({ ...prev, deliveryDate: date }));
                    if (errors.deliveryDate) {
                      setErrors(prev => ({ ...prev, deliveryDate: undefined }));
                    }
                  }}
                  locale={locale}
                  label={t('deliveryDate')}
                  placeholder={t('selectDate')}
                  helpText={t('datePickerHelp')}
                  leadTimeText={t('leadTime')}
                  required
                />
                {errors.deliveryDate && (
                  <p className="text-xs text-rose-500 mt-1">{errors.deliveryDate}</p>
                )}
              </div>

              {/* Sunday Pickup Notice */}
              <AnimatePresence>
                {isSunday && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="flex gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm">
                      <div className="flex-shrink-0 mt-0.5">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                          className="w-6 h-6 text-blue-600"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-blue-900 mb-1 text-sm">
                          {t('sundayPickupNotAvailable')}
                        </h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                          {t('sundayPickupNotice')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delivery Type - NOW SECOND */}
              <div>
                <label className="block text-sm font-medium text-charcoal-900 mb-3">
                  {t('deliveryType')} <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <motion.button
                    type="button"
                    onClick={() => !isSunday && setFormData(prev => ({ ...prev, deliveryType: 'pickup' }))}
                    whileTap={!isSunday ? { scale: 0.98 } : {}}
                    disabled={isSunday}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      isSunday
                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                        : formData.deliveryType === 'pickup'
                        ? 'border-brown-500 bg-brown-50 text-brown-700'
                        : 'border-cream-200 hover:border-brown-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🏪</div>
                    <div className="font-medium">{t('pickup')}</div>
                    {isSunday && (
                      <div className="text-xs mt-1 text-gray-500">
                        {t('notAvailable')}
                      </div>
                    )}
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, deliveryType: 'delivery' }))}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.deliveryType === 'delivery'
                        ? 'border-brown-500 bg-brown-50 text-brown-700'
                        : 'border-cream-200 hover:border-brown-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">🚚</div>
                    <div className="font-medium">{t('delivery')}</div>
                  </motion.button>
                </div>
              </div>

              {/* Delivery/Pickup Time (optional) */}
              <div>
                <label htmlFor="deliveryTime" className="block text-sm font-medium text-charcoal-900 mb-1">
                  {t('deliveryTime')} <span className="text-charcoal-900/60">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  id="deliveryTime"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleInputChange}
                  placeholder={t('deliveryTimePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cream-200 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-colors"
                />
                <p className="text-xs text-charcoal-900/60 mt-1">
                  {t('deliveryTimeHelp')}
                </p>
              </div>

              {/* Delivery Address Fields (only if delivery selected) */}
              <AnimatePresence>
                {formData.deliveryType === 'delivery' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 pt-4"
                  >
                    {/* Address */}
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium text-charcoal-900 mb-1">
                        {t('address')} <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder={t('addressPlaceholder')}
                        className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                          errors.address
                            ? 'border-rose-500 focus:border-rose-500'
                            : 'border-cream-200 focus:border-brown-500'
                        } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                      />
                      {errors.address && (
                        <p className="text-xs text-rose-500 mt-1">{errors.address}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* City */}
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-charcoal-900 mb-1">
                          {t('city')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          placeholder={t('cityPlaceholder')}
                          className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                            errors.city
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-cream-200 focus:border-brown-500'
                          } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                        />
                        {errors.city && (
                          <p className="text-xs text-rose-500 mt-1">{errors.city}</p>
                        )}
                      </div>

                      {/* Postal Code */}
                      <div>
                        <label htmlFor="postalCode" className="block text-sm font-medium text-charcoal-900 mb-1">
                          {t('postalCode')} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                          placeholder={t('postalCodePlaceholder')}
                          className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                            errors.postalCode
                              ? 'border-rose-500 focus:border-rose-500'
                              : 'border-cream-200 focus:border-brown-500'
                          } focus:outline-none focus:ring-2 focus:ring-brown-500/20`}
                        />
                        {errors.postalCode && (
                          <p className="text-xs text-rose-500 mt-1">{errors.postalCode}</p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Fee — Map + Stats */}
                    {formData.address && formData.city && formData.postalCode && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-2 overflow-hidden"
                      >
                        {isCalculatingDelivery ? (
                          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <svg
                              className="animate-spin h-5 w-5 text-brown-400 flex-shrink-0"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm text-charcoal-900/60">
                              {locale === 'it' ? 'Calcolo del costo di consegna...' : 'Calculating delivery fee...'}
                            </p>
                          </div>
                        ) : deliveryInfo.requiresContact ? (
                          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex-shrink-0">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-5 h-5 text-amber-600"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-amber-800">
                              {t('deliveryOutsideArea')}
                            </p>
                          </div>
                        ) : deliveryInfo.deliveryFee > 0 && deliveryInfo.isLuganoArea ? (
                          // Lugano zip code — flat fee, no API call
                          <div className="flex gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-green-600">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <p className="text-sm text-green-800">
                              {t('deliveryFeeInfo', { fee: formatPrice(deliveryInfo.deliveryFee) })}
                            </p>
                          </div>
                        ) : deliveryInfo.deliveryFee > 0 && deliveryInfo.distanceKm ? (
                          // Outside Lugano — Maps API result with route map
                          <div className="space-y-3">
                            {/* Route map — keyless embed, no API key exposed */}
                            <div className="rounded-lg overflow-hidden border border-cream-200">
                              <iframe
                                src={`https://maps.google.com/maps?saddr=${encodeURIComponent('Via Selva 4, Massagno 6900, Switzerland')}&daddr=${encodeURIComponent(`${formData.address}, ${formData.postalCode} ${formData.city}, ${formData.country}`)}&output=embed`}
                                width="100%"
                                height="220"
                                style={{ border: 0 }}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                              />
                            </div>
                            {/* Distance · Duration · Price */}
                            <div className="flex items-center gap-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="flex items-center gap-1.5 text-sm text-charcoal-900/70">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-600 flex-shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                <span>{deliveryInfo.distanceKm} km</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-charcoal-900/70">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-green-600 flex-shrink-0">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>~{deliveryInfo.durationMinutes} min</span>
                              </div>
                              <div className="ml-auto font-semibold text-charcoal-900">
                                {locale === 'it' ? 'Consegna' : 'Delivery'}: {formatPrice(deliveryInfo.deliveryFee)}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    )}

                    {/* Country */}
                    <div>
                      <label htmlFor="country" className="block text-sm font-medium text-charcoal-900 mb-1">
                        {t('country')}
                      </label>
                      <input
                        type="text"
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-lg border-2 border-cream-200 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-colors"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Special Instructions */}
              <div className="pt-4">
                <label htmlFor="specialInstructions" className="block text-sm font-medium text-charcoal-900 mb-1">
                  {t('specialInstructions')}
                </label>
                <textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  value={formData.specialInstructions}
                  onChange={handleInputChange}
                  placeholder={t('specialInstructionsPlaceholder')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border-2 border-cream-200 focus:border-brown-500 focus:outline-none focus:ring-2 focus:ring-brown-500/20 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Submit Button (Mobile) */}
          <div className="lg:hidden">
            <Button
              type="submit"
              disabled={isProcessing}
              size="lg"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('processing')}
                </>
              ) : (
                <>
                  💳 {t('proceedToPayment')}
                </>
              )}
            </Button>
            <p className="text-xs text-center text-charcoal-900/60 mt-3">
              🔒 {t('paymentSecure')}
            </p>
          </div>
        </form>
      </div>

      {/* Right Column - Order Summary */}
      <div className="lg:col-span-1">
        <OrderSummary 
          locale={locale} 
          isProcessing={isProcessing}
          deliveryFee={deliveryInfo.deliveryFee}
        />
      </div>
    </div>
  );
}

