'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import DatePicker from '@/components/products/DatePicker';
import type { Expense } from '@/lib/db/schema';

interface ExpensesTableProps {
  refreshTrigger: number;
  onEditExpense: (expense: Expense) => void;
}

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'ingredients', label: '🥚 Ingredients' },
  { value: 'utilities', label: '⚡ Utilities' },
  { value: 'labor', label: '👨‍🍳 Labor' },
  { value: 'supplies', label: '📦 Supplies' },
  { value: 'marketing', label: '📢 Marketing' },
  { value: 'rent', label: '🏠 Rent' },
  { value: 'other', label: '📌 Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: '🥚 Ingredients',
  utilities: '⚡ Utilities',
  labor: '👨‍🍳 Labor',
  supplies: '📦 Supplies',
  marketing: '📢 Marketing',
  rent: '🏠 Rent',
  other: '📌 Other',
};

export default function ExpensesTable({ refreshTrigger, onEditExpense }: ExpensesTableProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '100');

      const response = await fetch(`/api/admin/expenses?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setExpenses(data.expenses || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [refreshTrigger, categoryFilter, startDate, endDate]);

  const handleDelete = async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/expenses/${deletingExpense.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setExpenses((prev) => prev.filter((e) => e.id !== deletingExpense.id));
        setDeletingExpense(null);
      } else {
        alert('Failed to delete expense');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setSelectedStartDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setStartDate(dateStr);
    } else {
      setStartDate('');
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setSelectedEndDate(date);
    if (date) {
      const dateStr = date.toISOString().split('T')[0];
      setEndDate(dateStr);
    } else {
      setEndDate('');
    }
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setStartDate('');
    setEndDate('');
    setSelectedStartDate(undefined);
    setSelectedEndDate(undefined);
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-2">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2 border border-cream-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <DatePicker
              selectedDate={selectedStartDate}
              onDateChange={handleStartDateChange}
              locale="en"
              minDate={new Date(2020, 0, 1)}
            />
          </div>

          <div>
            <DatePicker
              selectedDate={selectedEndDate}
              onDateChange={handleEndDateChange}
              locale="en"
              minDate={selectedStartDate || new Date(2020, 0, 1)}
            />
          </div>
        </div>

        {(categoryFilter || startDate || endDate) && (
          <button
            onClick={handleClearFilters}
            className="mt-4 text-sm text-brown-600 hover:text-brown-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-charcoal-600">
              Total ({expenses.length} expenses)
            </p>
            <p className="text-3xl font-bold text-red-600 mt-1">
              {formatCurrency(totalExpenses.toString())}
            </p>
          </div>
          <Button
            onClick={() => {
              // Export to CSV
              const csvContent = [
                ['Date', 'Category', 'Amount', 'Description', 'Notes'],
                ...expenses.map((exp) => [
                  exp.date,
                  exp.category,
                  exp.amount,
                  exp.description,
                  exp.notes || '',
                ]),
              ]
                .map((row) => row.map((cell) => `"${cell}"`).join(','))
                .join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
            }}
            variant="secondary"
            size="sm"
          >
            📥 Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl font-semibold text-charcoal-700 mb-2">No expenses yet</p>
            <p className="text-charcoal-500">
              Click "Add Expense" to record your first expense
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-50">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-charcoal-700">
                    Date
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-charcoal-700">
                    Category
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-charcoal-700">
                    Description
                  </th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-charcoal-700">
                    Amount
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-charcoal-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr
                    key={expense.id}
                    className={`border-t border-cream-100 hover:bg-cream-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-cream-25'
                    }`}
                  >
                    <td className="py-4 px-6 text-sm text-charcoal-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-brown-100 text-brown-800">
                        {CATEGORY_LABELS[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-medium text-charcoal-900">
                        {expense.description}
                      </p>
                      {expense.notes && (
                        <p className="text-xs text-charcoal-500 mt-1">{expense.notes}</p>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right text-sm font-bold text-red-600">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onEditExpense(expense)}
                          className="px-3 py-1 text-sm font-medium text-brown-700 hover:text-brown-800 hover:bg-brown-50 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingExpense(expense)}
                          className="px-3 py-1 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingExpense}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setDeletingExpense(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
