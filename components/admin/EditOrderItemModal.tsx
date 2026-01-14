'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { Database } from '@/lib/supabase/types';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import ImageUpload from '@/components/admin/ImageUpload';
import { getFlavours } from '@/lib/sanity/queries';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface EditOrderItemModalProps {
  item: OrderItem;
  orderId: string;
  currency: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface ItemFormData {
  quantity: string;
  unit_price: string;
  writing_on_cake: string;
  internal_decoration_notes: string;
  staff_notes: string;
  weight_kg: string;
  diameter_cm: string;
  selected_flavour: string;
  flavour_name: string;
  product_image_url: string;
}

export default function EditOrderItemModal({
  item,
  orderId,
  currency,
  onClose,
  onUpdate,
}: EditOrderItemModalProps) {
  const [formData, setFormData] = useState<ItemFormData>({
    quantity: item.quantity.toString(),
    unit_price: item.unit_price.toString(),
    writing_on_cake: item.writing_on_cake || '',
    internal_decoration_notes: item.internal_decoration_notes || '',
    staff_notes: item.staff_notes || '',
    weight_kg: item.weight_kg?.toString() || '',
    diameter_cm: item.diameter_cm?.toString() || '',
    selected_flavour: item.selected_flavour || '',
    flavour_name: item.flavour_name || '',
    product_image_url: item.product_image_url || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLastItem, setIsLastItem] = useState(false);
  const [flavours, setFlavours] = useState<any[]>([]);
  const [isLoadingFlavours, setIsLoadingFlavours] = useState(true);

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Fetch flavours and check if this is the last item
  useEffect(() => {
    async function fetchData() {
      try {
        const flavoursData = await getFlavours('en');
        setFlavours(flavoursData || []);
        
        // Check if this is the last item in the order
        const response = await fetch(`/api/admin/orders/${orderId}/items`);
        if (response.ok) {
          const data = await response.json();
          setIsLastItem(data.items?.length === 1);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingFlavours(false);
      }
    }
    fetchData();
  }, [orderId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isSaving, onClose]);

  const calculateSubtotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unit_price) || 0;
    return quantity * unitPrice;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleFlavourChange = (flavourId: string) => {
    const flavour = flavours.find(f => f._id === flavourId);
    setFormData({
      ...formData,
      selected_flavour: flavourId,
      flavour_name: flavour?.name || '',
    });
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unit_price);
      const subtotal = quantity * unitPrice;

      const response = await fetch(`/api/admin/orders/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          unit_price: unitPrice,
          subtotal,
          writing_on_cake: formData.writing_on_cake || null,
          internal_decoration_notes: formData.internal_decoration_notes || null,
          staff_notes: formData.staff_notes || null,
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
          diameter_cm: formData.diameter_cm ? parseFloat(formData.diameter_cm) : null,
          selected_flavour: formData.selected_flavour || null,
          flavour_name: formData.flavour_name || null,
          product_image_url: formData.product_image_url || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/orders/items/${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete item');
      }

      const result = await response.json();
      
      // Show appropriate message based on whether order was deleted
      if (result.orderDeleted) {
        console.log('Last item deleted - entire order removed');
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const isFormValid = formData.quantity && formData.unit_price;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        margin: '0',
        padding: '16px',
      }}
    >
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold text-white">Edit Order Item</h2>
              <p className="text-sm text-brown-100 mt-1">{item.product_name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Product Info Header */}
          <div className="flex items-start gap-4 mb-6 pb-4 border-b-2 border-cream-200">
            {item.product_image_url && (
              <Image
                src={item.product_image_url}
                alt={item.product_name}
                width={100}
                height={100}
                className="rounded-lg object-cover border-2 border-cream-300 shadow-md"
              />
            )}
            <div className="flex-grow">
              <h3 className="font-heading font-bold text-xl text-charcoal-900 mb-2">
                {item.product_name}
              </h3>
              <div className="flex gap-3 flex-wrap">
                {item.size_label && (
                  <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                    Size: {item.size_label}
                  </span>
                )}
                {item.flavour_name && (
                  <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-semibold">
                    Flavour: {item.flavour_name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edit Form */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                autoFocus
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Unit Price ({currency}) *
              </label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                step="0.01"
                min="0"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              />
            </div>

            {/* Flavour */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Flavour
              </label>
              {isLoadingFlavours ? (
                <div className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 text-charcoal-500 text-sm">
                  Loading flavours...
                </div>
              ) : (
                <select
                  value={formData.selected_flavour || ''}
                  onChange={(e) => handleFlavourChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                >
                  <option value="">No flavour</option>
                  {flavours.map(flavour => (
                    <option key={flavour._id} value={flavour._id}>
                      {flavour.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Empty cell for layout balance */}
            <div></div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                step="0.001"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              />
            </div>

            {/* Diameter */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Diameter (cm)
              </label>
              <input
                type="number"
                value={formData.diameter_cm}
                onChange={(e) => setFormData({ ...formData, diameter_cm: e.target.value })}
                step="0.01"
                min="0"
                placeholder="Optional"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              />
            </div>

            {/* Reference Image */}
            <div className="col-span-2">
              <ImageUpload
                value={formData.product_image_url}
                onChange={(url) => setFormData({ ...formData, product_image_url: url })}
                label="Reference Image"
              />
            </div>

            {/* Writing on Cake */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Writing on Cake
              </label>
              <input
                type="text"
                value={formData.writing_on_cake}
                onChange={(e) => setFormData({ ...formData, writing_on_cake: e.target.value })}
                placeholder="Customer-facing text"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              />
            </div>

            {/* Internal Decoration Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Internal Decoration Notes
              </label>
              <textarea
                value={formData.internal_decoration_notes}
                onChange={(e) =>
                  setFormData({ ...formData, internal_decoration_notes: e.target.value })
                }
                placeholder="Internal notes for decoration team"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none"
              />
            </div>

            {/* Staff Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Staff Notes
              </label>
              <textarea
                value={formData.staff_notes}
                onChange={(e) => setFormData({ ...formData, staff_notes: e.target.value })}
                placeholder="General staff notes"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="mt-4 pt-4 border-t-2 border-cream-300">
            <div className="flex justify-between items-center">
              <span className="text-sm text-charcoal-600">Subtotal:</span>
              <span className="text-lg font-bold text-brown-500">
                {formatCurrency(calculateSubtotal())}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream-50 border-t-2 border-cream-200 px-6 py-4 flex-shrink-0">
          <div className="flex gap-2 mb-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-full border-2 border-cream-300 bg-white text-charcoal-700 font-semibold hover:bg-cream-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !isFormValid}
              className="flex-1 px-4 py-2 rounded-full bg-brown-500 text-white font-semibold hover:bg-brown-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          <button
            onClick={() => setDeleteConfirm(true)}
            disabled={isSaving}
            className="w-full px-4 py-2 rounded-full bg-rose-500 text-white font-semibold hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Item
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={isLastItem ? "Delete Entire Order?" : "Delete Order Item?"}
        message={
          isLastItem
            ? "This is the last item in the order. Deleting it will remove the entire order. This action cannot be undone."
            : "Are you sure you want to delete this item? This action cannot be undone and will update the order total."
        }
        confirmText={isLastItem ? "Delete Order" : "Delete Item"}
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
