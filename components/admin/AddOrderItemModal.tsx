'use client';

import { useState, useEffect } from 'react';
import { getFlavours } from '@/lib/sanity/queries';
import MultiImageUpload from '@/components/admin/MultiImageUpload';
import t from '@/lib/admin-translations-extended';
import { X } from 'lucide-react';

interface AddOrderItemModalProps {
  orderId: string;
  orderDeliveryDate: string;
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface NewItemFormData {
  product_name: string;
  product_image_urls: string[];
  quantity: string;
  unit_price: string;
  selected_flavour: string;
  writing_on_cake: string;
  internal_decoration_notes: string;
  staff_notes: string;
  weight_kg: string;
  diameter_cm: string;
}

export default function AddOrderItemModal({
  orderId,
  orderDeliveryDate,
  currency,
  onClose,
  onSuccess,
}: AddOrderItemModalProps) {
  const [formData, setFormData] = useState<NewItemFormData>({
    product_name: '',
    product_image_urls: [],
    quantity: '1',
    unit_price: '',
    selected_flavour: '',
    writing_on_cake: '',
    internal_decoration_notes: '',
    staff_notes: '',
    weight_kg: '',
    diameter_cm: '',
  });
  const [isSaving, setIsSaving] = useState(false);
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

  // Fetch flavours on mount
  useEffect(() => {
    async function fetchFlavours() {
      try {
        const flavoursData = await getFlavours('en');
        setFlavours(flavoursData || []);
      } catch (error) {
        console.error('Error fetching flavours:', error);
      } finally {
        setIsLoadingFlavours(false);
      }
    }
    fetchFlavours();
  }, []);

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

  const handleSubmit = async () => {
    setIsSaving(true);

    try {
      const quantity = parseFloat(formData.quantity);
      const unitPrice = parseFloat(formData.unit_price);
      const subtotal = quantity * unitPrice;

      // Find flavour name if flavour is selected
      const selectedFlavour = flavours.find(f => f._id === formData.selected_flavour);
      const flavourName = selectedFlavour ? selectedFlavour.name : null;

      const weightValue = formData.weight_kg.trim();

      const response = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_name: formData.product_name,
          product_image_urls: formData.product_image_urls.length ? formData.product_image_urls : null,
          quantity,
          unit_price: unitPrice,
          subtotal,
          selected_flavour: formData.selected_flavour || null,
          flavour_name: flavourName,
          writing_on_cake: formData.writing_on_cake || null,
          internal_decoration_notes: formData.internal_decoration_notes || null,
          staff_notes: formData.staff_notes || null,
          weight_kg: weightValue ? weightValue : null,
          diameter_cm: formData.diameter_cm ? parseFloat(formData.diameter_cm) : null,
          delivery_date: orderDeliveryDate,
        }),
      });

      if (!response.ok) {
        throw new Error(t.failedToAddItem);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      alert(t.failedToAddItem + '. ' + t.tryAgain);
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = formData.product_name.trim() && formData.quantity && formData.unit_price;

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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-heading font-bold text-white">Add New Item</h2>
              <p className="text-sm text-blue-100 mt-1">Add a new item to this order</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            {/* Product Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g., Torta Qualocsa"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                autoFocus
              />
            </div>

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

            {/* Flavour Selection */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Flavour
              </label>
              {isLoadingFlavours ? (
                <div className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 bg-cream-50 text-charcoal-500">
                  Loading flavours...
                </div>
              ) : (
                <select
                  value={formData.selected_flavour}
                  onChange={(e) => setFormData({ ...formData, selected_flavour: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                >
                  <option value="">No flavour</option>
                  {flavours.map((flavour) => (
                    <option key={flavour._id} value={flavour._id}>
                      {flavour.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="text"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                placeholder="Необязательно"
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
                placeholder="Необязательно"
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              />
            </div>

            {/* Product Images Upload */}
            <div className="col-span-2">
              <MultiImageUpload
                value={formData.product_image_urls}
                onChange={(urls) => setFormData({ ...formData, product_image_urls: urls })}
                label={t.productImageOptional}
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
                placeholder="Текст для клиента"
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
                placeholder="Внутренние заметки для команды декораторов"
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
                placeholder="Общие заметки персонала"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Subtotal Preview */}
          <div className="mt-4 pt-4 border-t-2 border-blue-300">
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
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 rounded-full border-2 border-cream-300 bg-white text-charcoal-700 font-semibold hover:bg-cream-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !isFormValid}
              className="flex-1 px-4 py-2 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
