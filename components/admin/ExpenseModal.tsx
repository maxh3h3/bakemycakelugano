'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import DatePicker from '@/components/products/DatePicker';
import type { Expense } from '@/lib/db/schema';

interface ExpenseModalProps {
  expense: Expense | null;
  onClose: () => void;
  onSave: () => void;
}

const CATEGORY_OPTIONS = [
  { value: 'ingredients', label: '🥚 Ingredients' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'labor', label: '👨‍🍳 Labor' },
  { value: 'supplies', label: '📦 Supplies' },
  { value: 'marketing', label: '📢 Marketing' },
  { value: 'rent', label: '🏠 Rent' },
  { value: 'other', label: '📌 Other' },
];

export default function ExpenseModal({ expense, onClose, onSave }: ExpenseModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [formData, setFormData] = useState({
    date: '',
    category: 'ingredients',
    amount: '',
    description: '',
    notes: '',
    receipt_url: '',
  });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        notes: expense.notes || '',
        receipt_url: expense.receiptUrl || '',
      });
      setSelectedDate(new Date(expense.date));
    } else {
      // Set default date to today
      const today = new Date();
      setSelectedDate(today);
      const todayStr = today.toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, date: todayStr }));
    }
  }, [expense]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSaving(true);

    try {
      const method = expense ? 'PUT' : 'POST';
      const url = expense
        ? `/api/admin/expenses/${expense.id}`
        : '/api/admin/expenses';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to save expense');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (
    field: string,
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, date: dateStr }));
      // Clear error when user selects a date
      if (errors.date) {
        setErrors((prev) => ({ ...prev, date: '' }));
      }
    } else {
      setFormData((prev) => ({ ...prev, date: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-cream-200 px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-heading font-bold text-charcoal-900">
              {expense ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <button
              onClick={onClose}
              className="text-charcoal-400 hover:text-charcoal-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date */}
          <div>
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              locale="en"
              required
              minDate={new Date(2020, 0, 1)} // Allow past dates for expense tracking
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-cream-300'
              }`}
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Amount (CHF) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              placeholder="0.00"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent ${
                errors.amount ? 'border-red-500' : 'border-cream-300'
              }`}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Description *
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="e.g., Flour and sugar supplies"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent ${
                errors.description ? 'border-red-500' : 'border-cream-300'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional details..."
              rows={3}
              className="w-full px-4 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Receipt URL (simplified for now) */}
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Receipt URL (optional)
            </label>
            <input
              type="text"
              value={formData.receipt_url}
              onChange={(e) => handleChange('receipt_url', e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-3 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-charcoal-500">
              You can upload receipts to your storage and paste the URL here
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-cream-200">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
