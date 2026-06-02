'use client';

import { useState, useEffect, useRef } from 'react';
import OrderItemImageCarousel from '@/components/admin/OrderItemImageCarousel';
import { format } from 'date-fns';
import type { Database } from '@/lib/supabase/types';
import { formatDeliveryAddress } from '@/lib/schemas/delivery';
import { parseDateFromDB } from '@/lib/utils';
import EditOrderModal from '@/components/admin/EditOrderModal';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import OrderConfirmationModal from '@/components/admin/OrderConfirmationModal';
import t from '@/lib/admin-translations-extended';
import { Edit, ChevronDown, Trash2, Pencil, Paintbrush, FileText, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

interface OrderWithItems extends Order {
  order_items: OrderItem[];
  client: Client | null;
}

interface OrderCardProps {
  order: OrderWithItems;
  onUpdate: () => void;
}

export default function OrderCard({ order: initialOrder, onUpdate }: OrderCardProps) {
  const [order, setOrder] = useState<OrderWithItems>(initialOrder);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; orderId: string | null }>({
    isOpen: false,
    orderId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const paymentSelectorRef = useRef<HTMLDivElement>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Sync local state when prop changes (e.g., from router.refresh())
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Close payment selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paymentSelectorRef.current && !paymentSelectorRef.current.contains(event.target as Node)) {
        setShowPaymentSelector(false);
      }
    };

    if (showPaymentSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPaymentSelector]);


  const formatCurrency = (amount: number, currency: string = 'CHF') => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Build flat array of all photos from all items
  const getAllPhotos = () => {
    const photos: Array<{ url: string; itemName: string; itemIndex: number }> = [];
    order.order_items.forEach((item, itemIndex) => {
      if (item.product_image_urls && item.product_image_urls.length > 0) {
        item.product_image_urls.forEach(url => {
          photos.push({
            url,
            itemName: item.product_name,
            itemIndex,
          });
        });
      }
    });
    return photos;
  };

  // Navigate to previous photo
  const goToPreviousPhoto = () => {
    const allPhotos = getAllPhotos();
    if (allPhotos.length === 0) return;
    
    setCurrentPhotoIndex(prev => 
      prev === 0 ? allPhotos.length - 1 : prev - 1
    );
  };

  // Navigate to next photo
  const goToNextPhoto = () => {
    const allPhotos = getAllPhotos();
    if (allPhotos.length === 0) return;
    
    setCurrentPhotoIndex(prev => 
      (prev + 1) % allPhotos.length
    );
  };

  const toggleExpansion = () => {
    setIsExpanded(!isExpanded);
  };

  const deleteOrder = async (orderId: string) => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete order');
      }

      onUpdate();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(error instanceof Error ? error.message : t.failedToDeleteOrder + '. ' + t.tryAgain);
      setIsDeleting(false);
      setDeleteConfirm({ isOpen: false, orderId: null });
    }
  };

  const handlePaymentStatusChange = async (newPaidStatus: string) => {
    if (newPaidStatus === '') return;
    
    const isPaid = newPaidStatus === 'paid';
    
    // If marking as paid, call mark-paid endpoint (creates revenue transaction)
    // If marking as unpaid, call mark-unpaid endpoint (deletes revenue transaction)
    
    setIsMarkingPaid(true);
    setShowPaymentSelector(false);

    try {
      if (isPaid) {
        // Call mark-paid endpoint (creates revenue transaction)
        const response = await fetch(`/api/admin/orders/${order.id}/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payment_method: 'cash' }), // Default to cash
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to mark order as paid');
        }

        // Update local state optimistically
        setOrder(prev => ({
          ...prev,
          paid: true,
          payment_method: 'cash',
        }));
      } else {
        // Call mark-unpaid endpoint (deletes revenue transaction)
        const response = await fetch(`/api/admin/orders/${order.id}/mark-unpaid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to mark order as unpaid');
        }

        // Update local state optimistically
        setOrder(prev => ({
          ...prev,
          paid: false,
        }));
      }

      // Refresh in background
      onUpdate();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert(error instanceof Error ? error.message : 'Failed to update payment status. Please try again.');
    } finally {
      setIsMarkingPaid(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 transition-all duration-300 hover:shadow-lg">
        {/* Order Header */}
        <div className="relative p-3 sm:p-4 md:p-6">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {!isExpanded && (
              <>
                {/* Top Row: Order Number & Delivery Time (horizontal) */}
                <div className="bg-brown-50 rounded-xl border-2 border-brown-200 w-full min-h-[70px] flex flex-row overflow-hidden mb-3">
                  {/* Order Number */}
                  <div className="bg-brown-50 p-2 flex-1 flex flex-col justify-center border-r-2 border-brown-200">
                    <p className="text-xs font-semibold text-brown-600 uppercase mb-1">Order #</p>
                    <p className="font-mono text-sm font-bold text-brown-500">
                      {order.order_number || order.id.slice(0, 8) + '...'}
                    </p>
                  </div>
                  
                  {/* Delivery Time */}
                  <div className="bg-brown-100/50 p-2 flex-1 flex flex-col justify-center">
                    <p className="text-xs font-semibold text-brown-600 uppercase mb-1">Время</p>
                    <p className="text-sm font-bold text-brown-700">
                      {order.delivery_time || '-'}
                    </p>
                  </div>
                </div>

                {/* Second Row: Image (left) and Info cards (right) */}
                <div className="flex gap-3">
                  {/* Left: Big Image */}
                  {order.order_items.length > 0 && (() => {
                    const allPhotos = getAllPhotos();
                    
                    // If no photos, show first item with placeholder
                    if (allPhotos.length === 0) {
                      const firstItem = order.order_items[0];
                      return (
                        <div className="relative bg-orange-50 rounded-xl border-2 border-orange-200 w-[180px] h-[180px] flex-shrink-0 flex items-center justify-center overflow-hidden">
                          <div className="w-full h-full rounded-lg border-2 border-dashed border-orange-300 bg-orange-100 flex flex-col items-center justify-center p-3">
                            <svg className="w-16 h-16 text-orange-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs font-semibold text-center text-charcoal-900 line-clamp-3 leading-tight">
                              {firstItem.product_name}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    
                    const currentPhoto = allPhotos[currentPhotoIndex];
                    const hasMultiplePhotos = allPhotos.length > 1;
                    
                    return (
                      <div className="relative rounded-xl border-2 border-orange-200 w-[180px] h-[180px] flex-shrink-0 overflow-hidden flex items-center justify-center">
                        {/* Previous Photo Button */}
                        {hasMultiplePhotos && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              goToPreviousPhoto();
                            }}
                            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-all"
                            title="Previous photo"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        )}
                        
                        {/* Image with Name Overlay */}
                        <div className="relative w-full h-full">
                          <img
                            src={currentPhoto.url}
                            alt={currentPhoto.itemName}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* Item Name Overlay at Bottom */}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-sm px-3 py-2">
                            <p className="text-xs font-semibold text-white text-center line-clamp-1 leading-tight">
                              {currentPhoto.itemName}
                            </p>
                          </div>
                        </div>
                        
                        {/* Next Photo Button */}
                        {hasMultiplePhotos && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              goToNextPhoto();
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-all"
                            title="Next photo"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Right: Info cards stacked vertically */}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Customer */}
                    <div className="bg-purple-50 rounded-xl p-2 border-2 border-purple-200 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-purple-600 uppercase mb-1">{t.customer}</p>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <p className="font-bold text-sm text-charcoal-900 truncate">{order.client?.name || 'Unknown'}</p>
                          {order.client && order.client.total_orders && order.client.total_orders > 1 && (
                            <span
                              className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                              title="Returning customer"
                            >
                              ★
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-purple-700 truncate">{order.client?.email || order.client?.phone || 'No contact'}</p>
                      </div>
                    </div>

                    {/* Total & Payment */}
                    <div 
                      ref={paymentSelectorRef}
                      className={`rounded-xl p-2 border-2 flex flex-col justify-between relative ${
                        order.paid 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-rose-50 border-rose-200'
                      }`}
                    >
                      <p className={`text-xs font-semibold uppercase mb-1 ${
                        order.paid ? 'text-green-600' : 'text-rose-600'
                      }`}>{t.total}</p>
                      <div 
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => !isMarkingPaid && setShowPaymentSelector(!showPaymentSelector)}
                      >
                        <p className={`text-base font-bold ${
                          order.paid ? 'text-green-700' : 'text-rose-700'
                        }`}>
                          {isMarkingPaid ? 'Обработка...' : formatCurrency(order.total_amount, order.currency)}
                        </p>
                      </div>

                      {/* Payment Status Selector - Above */}
                      {showPaymentSelector && !isMarkingPaid && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 z-[9999] bg-white rounded-lg shadow-2xl border-2 border-cream-300 overflow-hidden">
                          <button
                            onClick={() => handlePaymentStatusChange('paid')}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 border-b border-cream-200 ${
                              order.paid 
                                ? 'bg-green-100 text-green-800 font-semibold' 
                                : 'hover:bg-green-50 text-charcoal-900'
                            }`}
                          >
                            <span className="text-xs">Оплачено</span>
                          </button>
                          <button
                            onClick={() => handlePaymentStatusChange('unpaid')}
                            className={`w-full px-3 py-2 text-left transition-colors flex items-center gap-2 ${
                              !order.paid 
                                ? 'bg-rose-100 text-rose-800 font-semibold' 
                                : 'hover:bg-rose-50 text-charcoal-900'
                            }`}
                          >
                            <span className="text-xs">Не оплачено</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delivery Type */}
                    <div className="bg-blue-50 rounded-xl p-2 border-2 border-blue-200 flex flex-col justify-between">
                      <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{t.delivery}</p>
                      <p className="font-bold text-sm text-charcoal-900 capitalize">
                        {order.delivery_type || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Bottom on Mobile */}
                <div className="flex flex-row items-center justify-center gap-2 w-full mt-3">
                  {/* Edit Order Button */}
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-110 flex-1"
                    title={t.editOrder}
                  >
                    <Edit className="w-4 h-4 mx-auto" />
                  </button>

                  {/* Confirmation Card Button */}
                  <button
                    onClick={() => setIsConfirmationModalOpen(true)}
                    className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-md hover:shadow-lg hover:scale-110 flex-1"
                    title="Карточка подтверждения"
                  >
                    <MessageSquare className="w-4 h-4 mx-auto" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                    className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md hover:shadow-lg hover:scale-110 flex-1"
                    title={t.deleteOrder}
                  >
                    <Trash2 className="w-4 h-4 mx-auto" />
                  </button>

                  {/* Expand/Collapse Button */}
                  <button
                    onClick={toggleExpansion}
                    className="p-2 rounded-full bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-all flex-1"
                    title={isExpanded ? "Свернуть" : "Развернуть"}
                  >
                    <ChevronDown
                      className={`w-4 h-4 mx-auto transition-transform duration-300 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>
              </>
            )}

            {/* When expanded on mobile, show simplified view */}
            {isExpanded && (
              <div className="flex flex-row items-center justify-end gap-2 w-full">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title={t.editOrder}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsConfirmationModalOpen(true)}
                  className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title="Карточка подтверждения"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                  className="p-2 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                  title={t.deleteOrder}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleExpansion}
                  className="p-2 rounded-full bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-all"
                  title="Свернуть"
                >
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 rotate-180" />
                </button>
              </div>
            )}
          </div>

          {/* Desktop/Tablet Layout (md and up) */}
          <div className="hidden md:flex items-stretch gap-4">
            {/* Order Number & Delivery Time - Split into two sections */}
            <div className="bg-brown-50 rounded-xl border-2 border-brown-200 min-w-[140px] min-h-[100px] flex flex-col overflow-hidden">
              {/* Top Section: Order Number */}
              <div className="bg-brown-50 p-3 flex-1 flex flex-col justify-center border-b-2 border-brown-200">
                <p className="text-xs font-semibold text-brown-600 uppercase mb-1">Order #</p>
                <p className="font-mono text-base font-bold text-brown-500">
                  {order.order_number || order.id.slice(0, 8) + '...'}
                </p>
              </div>
              
              {/* Bottom Section: Delivery Time */}
              <div className="bg-brown-100/50 p-3 flex flex-col justify-center">
                <p className="text-xs font-semibold text-brown-600 uppercase mb-1">Время</p>
                <p className="text-sm font-bold text-brown-700">
                  {order.delivery_time || '-'}
                </p>
              </div>
            </div>

            {/* Order Items Preview */}
            {!isExpanded && order.order_items.length > 0 && (() => {
              const allPhotos = getAllPhotos();
              
              // If no photos, show first item with placeholder
              if (allPhotos.length === 0) {
                const firstItem = order.order_items[0];
                return (
                  <div className="relative bg-orange-50 rounded-xl border-2 border-orange-200 w-[140px] h-[140px] flex items-center justify-center overflow-hidden">
                    <div className="w-full h-full rounded-lg border-2 border-dashed border-orange-300 bg-orange-100 flex flex-col items-center justify-center p-4">
                      <svg className="w-12 h-12 text-orange-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs font-semibold text-center text-charcoal-900 line-clamp-2 leading-tight">
                        {firstItem.product_name}
                      </p>
                    </div>
                  </div>
                );
              }
              
              const currentPhoto = allPhotos[currentPhotoIndex];
              const hasMultiplePhotos = allPhotos.length > 1;
              
              return (
                <div className="relative rounded-xl border-2 border-orange-200 w-[140px] h-[140px] overflow-hidden flex items-center justify-center flex-shrink-0">
                  {/* Previous Photo Button */}
                  {hasMultiplePhotos && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToPreviousPhoto();
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-all flex-shrink-0"
                      title="Previous photo"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Image with Name Overlay */}
                  <div className="relative w-full h-full">
                    <img
                      src={currentPhoto.url}
                      alt={currentPhoto.itemName}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Item Name Overlay at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/75 backdrop-blur-sm px-3 py-2">
                      <p className="text-xs font-semibold text-white text-center line-clamp-1 leading-tight">
                        {currentPhoto.itemName}
                      </p>
                    </div>
                  </div>
                  
                  {/* Next Photo Button */}
                  {hasMultiplePhotos && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        goToNextPhoto();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-lg transition-all flex-shrink-0"
                      title="Next photo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Customer */}
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-purple-600 uppercase mb-1">{t.customer}</p>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-bold text-base text-charcoal-900 truncate">{order.client?.name || 'Unknown Customer'}</p>
                  {order.client && order.client.total_orders && order.client.total_orders > 1 && (
                    <span
                      className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      title="Returning customer"
                    >
                      ★
                    </span>
                  )}
                </div>
                <p className="text-xs text-purple-700 truncate">{order.client?.email || order.client?.phone || 'No contact info'}</p>
              </div>
            </div>

            {/* Total & Payment */}
            <div 
              ref={paymentSelectorRef}
              className={`rounded-xl p-4 border-2 flex-1 min-h-[100px] flex flex-col justify-between relative ${
                order.paid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <p className={`text-xs font-semibold uppercase mb-1 ${
                order.paid ? 'text-green-600' : 'text-rose-600'
              }`}>{t.total}</p>
              <div 
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => !isMarkingPaid && setShowPaymentSelector(!showPaymentSelector)}
              >
                <p className={`text-xl font-bold ${
                  order.paid ? 'text-green-700' : 'text-rose-700'
                }`}>
                  {isMarkingPaid ? 'Обработка...' : formatCurrency(order.total_amount, order.currency)}
                </p>
              </div>

              {/* Payment Status Selector - Above */}
              {showPaymentSelector && !isMarkingPaid && (
                <div className="absolute bottom-full left-0 right-0 mb-2 z-[9999] bg-white rounded-lg shadow-2xl border-2 border-cream-300 overflow-hidden">
                  <button
                    onClick={() => handlePaymentStatusChange('paid')}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2 border-b border-cream-200 ${
                      order.paid 
                        ? 'bg-green-100 text-green-800 font-semibold' 
                        : 'hover:bg-green-50 text-charcoal-900'
                    }`}
                  >
                    <span className="text-sm">Оплачено</span>
                  </button>
                  <button
                    onClick={() => handlePaymentStatusChange('unpaid')}
                    className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2 ${
                      !order.paid 
                        ? 'bg-rose-100 text-rose-800 font-semibold' 
                        : 'hover:bg-rose-50 text-charcoal-900'
                    }`}
                  >
                    <span className="text-sm">Не оплачено</span>
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Type */}
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200 flex-1 min-h-[100px] flex flex-col justify-between">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-1">{t.delivery}</p>
              <p className="font-bold text-base text-charcoal-900 capitalize">
                {order.delivery_type || 'N/A'}
              </p>
            </div>

            {/* Action Buttons - Vertically Centered */}
            <div className="flex flex-col items-center justify-center gap-2">
              {/* Edit Order Button */}
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                title={t.editOrder}
              >
                <Edit className="w-5 h-5" />
              </button>

              {/* Confirmation Card Button */}
              <button
                onClick={() => setIsConfirmationModalOpen(true)}
                className="p-3 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                title="Карточка подтверждения"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Delete Order Button */}
              <button
                onClick={() => setDeleteConfirm({ isOpen: true, orderId: order.id })}
                className="p-3 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md hover:shadow-lg hover:scale-110"
                title={t.deleteOrder}
              >
                <Trash2 className="w-5 h-5" />
              </button>

              {/* Expand/Collapse Button */}
              <button
                onClick={toggleExpansion}
                className="p-3 rounded-full bg-cream-100 text-charcoal-700 hover:bg-cream-200 transition-all"
                title={isExpanded ? "Свернуть" : "Развернуть"}
              >
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Order Details */}
        <div
          className={`border-t-2 border-cream-200 bg-cream-50/30 transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="p-3 sm:p-4 md:p-6">
            {/* Delivery Details Section */}
            <div className="mb-4 sm:mb-6">
              <h4 className="font-heading font-semibold text-sm sm:text-base text-brown-500 mb-2 sm:mb-3">
                Информация о доставке
              </h4>
              <div className="space-y-2 text-xs sm:text-sm bg-white p-3 sm:p-4 rounded-xl border border-cream-300">
                <p>
                  <span className="text-charcoal-500">Тип:</span>{' '}
                  <span className="font-medium capitalize">
                    {order.delivery_type === 'delivery' ? t.delivery : order.delivery_type === 'pickup' ? t.pickup : 'N/A'}
                  </span>
                </p>
                {order.delivery_date && (
                  <p>
                    <span className="text-charcoal-500">Дата:</span>{' '}
                    <span className="font-medium">
                      {format(parseDateFromDB(order.delivery_date), 'MMMM dd, yyyy')}
                    </span>
                  </p>
                )}
                {order.delivery_address && (
                  <p className="break-words">
                    <span className="text-charcoal-500">Адрес:</span>{' '}
                    <span className="font-medium">{formatDeliveryAddress(order.delivery_address)}</span>
                  </p>
                )}
                {order.delivery_time && (
                  <p>
                    <span className="text-charcoal-500">Время:</span>{' '}
                    <span className="font-medium">{order.delivery_time}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Customer Notes */}
            {order.customer_notes && (
              <div className="mb-4 sm:mb-6">
                <h4 className="font-heading font-semibold text-sm sm:text-base text-brown-500 mb-2 sm:mb-3">
                  {t.notes}
                </h4>
                <p className="text-xs sm:text-sm text-charcoal-700 bg-white p-3 sm:p-4 rounded-xl border border-cream-300 break-words">
                  {order.customer_notes}
                </p>
              </div>
            )}

            {/* Order Items */}
            <div>
              <h4 className="font-heading font-semibold text-sm sm:text-base text-brown-500 mb-2 sm:mb-3">{t.orderItems}</h4>
              <div className="space-y-3 sm:space-y-4">
                {order.order_items.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-3 sm:p-4 md:p-5 border-2 border-cream-300 shadow-sm"
                  >
                    {/* Item Header with Title and Price */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-grow w-full">
                        {/* Product Images - Enhanced Size */}
                        {item.product_image_urls && item.product_image_urls.length > 0 ? (
                          <div className="flex-shrink-0">
                            <OrderItemImageCarousel
                              urls={item.product_image_urls}
                              containerClassName="relative w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 rounded-xl border-2 border-cream-300 shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                              imageClassName="object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-20 sm:w-24 md:w-32 h-20 sm:h-24 md:h-32 rounded-xl border-2 border-dashed border-cream-400 bg-cream-50 flex items-center justify-center">
                            <div className="text-center px-2 sm:px-3">
                              <svg
                                className="w-6 sm:w-8 md:w-10 h-6 sm:h-8 md:h-10 mx-auto mb-1 sm:mb-2 text-cream-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                              <p className="text-xs text-cream-500 font-medium">No photo</p>
                            </div>
                          </div>
                        )}

                        {/* Product Title */}
                        <div className="flex-grow min-w-0">
                          <h5 className="font-heading font-bold text-lg sm:text-xl md:text-2xl text-charcoal-900 break-words">
                            {item.product_name}
                          </h5>
                          {item.product_image_urls && item.product_image_urls.length > 0 && (
                            <p className="text-xs text-charcoal-500 mt-1">
                              {item.product_image_urls.length} {item.product_image_urls.length === 1 ? 'photo' : 'photos'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="bg-cream-50 border-2 border-cream-300 rounded-xl px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-right flex-1 sm:flex-initial sm:min-w-[120px] md:min-w-[140px]">
                          <p className="text-lg sm:text-xl md:text-2xl font-bold text-brown-600">
                            {formatCurrency(item.subtotal, order.currency)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Grid - Below Title */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                      {item.flavour_name && (
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-2 sm:p-3">
                          <p className="text-xs font-semibold text-purple-600 uppercase mb-0.5 sm:mb-1">
                            {t.flavour}
                          </p>
                          <p className="text-sm sm:text-base font-bold text-charcoal-900 break-words">
                            {item.flavour_name}
                          </p>
                        </div>
                      )}

                      <div className="bg-green-50 border-2 border-green-300 rounded-xl p-2 sm:p-3">
                        <p className="text-xs font-semibold text-green-600 uppercase mb-0.5 sm:mb-1">
                          {t.quantity}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-charcoal-900">{item.quantity}</p>
                      </div>

                      {item.weight_kg && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-2 sm:p-3">
                          <p className="text-xs font-semibold text-orange-600 uppercase mb-0.5 sm:mb-1">
                            Вес
                          </p>
                          <p className="text-sm sm:text-base font-bold text-charcoal-900">
                            {item.weight_kg}
                          </p>
                        </div>
                      )}

                      {item.diameter_cm && (
                        <div className="bg-pink-50 border-2 border-pink-300 rounded-xl p-2 sm:p-3">
                          <p className="text-xs font-semibold text-pink-600 uppercase mb-0.5 sm:mb-1">
                            Диаметр
                          </p>
                          <p className="text-sm sm:text-base font-bold text-charcoal-900">
                            {item.diameter_cm} cm
                          </p>
                        </div>
                      )}

                      {item.production_status && (
                        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-xl p-2 sm:p-3">
                          <p className="text-xs font-semibold text-indigo-600 uppercase mb-0.5 sm:mb-1">
                            {t.status}
                          </p>
                          <p className="text-sm sm:text-base font-bold text-charcoal-900">
                            {{
                              new: 'Новый',
                              in_progress: 'В работе',
                              baked: 'Испечен',
                              creamed: 'Покрыт кремом',
                              assembled: 'Собран',
                              decorated: 'Украшен',
                            }[item.production_status] ?? item.production_status}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Special Notes Section */}
                    {(item.writing_on_cake || item.internal_decoration_notes || item.staff_notes) && (
                      <div className="space-y-2 sm:space-y-3 mt-3 sm:mt-4">
                        {item.writing_on_cake && (
                          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-xl p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                              <Pencil className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600 flex-shrink-0" />
                              <p className="text-xs sm:text-sm font-bold text-purple-700 uppercase tracking-wide">
                                {t.writingOnCake}
                              </p>
                            </div>
                            <p className="text-sm sm:text-base text-purple-900 pl-6 sm:pl-8 break-words">
                              {item.writing_on_cake}
                            </p>
                          </div>
                        )}

                        {item.internal_decoration_notes && (
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-xl p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                              <Paintbrush className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                              <p className="text-xs sm:text-sm font-bold text-blue-700 uppercase tracking-wide">
                                Примечания по декору
                              </p>
                            </div>
                            <p className="text-sm sm:text-base text-blue-900 pl-6 sm:pl-8 break-words">
                              {item.internal_decoration_notes}
                            </p>
                          </div>
                        )}

                        {item.staff_notes && (
                          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border-2 border-amber-300 rounded-xl p-3 sm:p-4">
                            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                              <FileText className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600 flex-shrink-0" />
                              <p className="text-xs sm:text-sm font-bold text-amber-700 uppercase tracking-wide">
                                Примечания персонала
                              </p>
                            </div>
                            <p className="text-sm sm:text-base text-amber-900 pl-6 sm:pl-8 break-words">{item.staff_notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Order Modal */}
      {isEditModalOpen && (
        <EditOrderModal
          order={order}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => {
            setIsEditModalOpen(false);
            onUpdate();
          }}
        />
      )}

      {/* Order Confirmation Card Modal */}
      {isConfirmationModalOpen && (
        <OrderConfirmationModal
          order={order}
          onClose={() => setIsConfirmationModalOpen(false)}
        />
      )}

      {/* Delete Order Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, orderId: null })}
        onConfirm={() => deleteConfirm.orderId && deleteOrder(deleteConfirm.orderId)}
        title={t.deleteOrder + "?"}
        message="Вы уверены, что хотите удалить этот заказ? Это безвозвратно удалит все позиции заказа. Запись клиента останется, но его статистика будет обновлена."
        confirmText={t.deleteOrder}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
