'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Trash2, Save, X } from 'lucide-react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import t from '@/lib/admin-translations-extended';

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: string;
  description: string;
  notes: string | null;
}

const CATEGORY_OPTIONS = [
  { value: 'ingredients', label: '🥚 Ингредиенты', emoji: '🥚' },
  { value: 'utilities', label: '⚡ Коммунальные услуги', emoji: '⚡' },
  { value: 'labor', label: '👨‍🍳 Зарплаты', emoji: '👨‍🍳' },
  { value: 'supplies', label: '📦 Упаковка', emoji: '📦' },
  { value: 'packaging', label: '🎁 Упаковочные материалы', emoji: '🎁' },
  { value: 'equipment', label: '🔧 Оборудование', emoji: '🔧' },
  { value: 'delivery', label: '🚗 Доставка', emoji: '🚗' },
  { value: 'marketing', label: '📢 Маркетинг', emoji: '📢' },
  { value: 'rent', label: '🏠 Аренда', emoji: '🏠' },
  { value: 'other', label: '📌 Другое', emoji: '📌' },
];

const CATEGORY_LABELS: Record<string, string> = CATEGORY_OPTIONS.reduce((acc, cat) => {
  acc[cat.value] = cat.label;
  return acc;
}, {} as Record<string, string>);

export default function InlineExpensesTable() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set());
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newRow, setNewRow] = useState<Partial<Expense> | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/expenses?limit=100&sortBy=date&sortOrder=desc');
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

  const updateExpense = async (id: string, field: string, value: string) => {
    const cellKey = `${id}-${field}`;
    setSavingCells((prev) => new Set(prev).add(cellKey));

    try {
      const expense = expenses.find((e) => e.id === id);
      if (!expense) return;

      const updatedExpense = { ...expense, [field]: value };

      const response = await fetch(`/api/admin/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedExpense),
      });

      if (response.ok) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
        );
      } else {
        alert('Failed to update expense');
      }
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Failed to update expense');
    } finally {
      setSavingCells((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  const handleCellClick = (id: string, field: string) => {
    setEditingCell({ id, field });
  };

  const handleCellBlur = (id: string, field: string, value: string) => {
    const expense = expenses.find((e) => e.id === id);
    if (expense && expense[field as keyof Expense] !== value) {
      updateExpense(id, field, value);
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, value: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCellBlur(id, field, value);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const handleDeleteExpense = async () => {
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

  const startNewRow = () => {
    const today = new Date().toISOString().split('T')[0];
    setNewRow({
      date: today,
      category: 'ingredients',
      amount: '',
      description: '',
      notes: null,
    });
  };

  const saveNewRow = async () => {
    if (!newRow || !newRow.amount || !newRow.description) {
      alert('Amount and description are required');
      return;
    }

    try {
      const response = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow),
      });

      if (response.ok) {
        const data = await response.json();
        setExpenses((prev) => [data.expense, ...prev]);
        setNewRow(null);
      } else {
        alert('Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    }
  };

  const cancelNewRow = () => {
    setNewRow(null);
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

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brown-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Total */}
      <div className="bg-gradient-to-r from-brown-50 to-cream-50 rounded-xl shadow-md p-6 border border-brown-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-charcoal-600 mb-1">Total Expenses</p>
            <p className="text-4xl font-bold text-brown-700">
              {formatCurrency(totalExpenses.toString())}
            </p>
            <p className="text-sm text-charcoal-500 mt-1">
              {expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>
          <button
            onClick={startNewRow}
            className="flex items-center gap-2 px-6 py-3 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-cream-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-50 border-b-2 border-cream-200">
              <tr>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-32">
                  Date
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-40">
                  Category
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-32">
                  Amount
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700">
                  Description
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700">
                  Notes
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-charcoal-700 w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {/* New Row */}
              {newRow && (
                <tr className="bg-green-50 border-b border-green-200 animate-fade-in">
                  <td className="py-2 px-4">
                    <input
                      type="date"
                      value={newRow.date || ''}
                      onChange={(e) => setNewRow({ ...newRow, date: e.target.value })}
                      className="w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <select
                      value={newRow.category || 'ingredients'}
                      onChange={(e) => setNewRow({ ...newRow, category: e.target.value })}
                      className="w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newRow.amount || ''}
                      onChange={(e) => setNewRow({ ...newRow, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-medium"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={newRow.description || ''}
                      onChange={(e) => setNewRow({ ...newRow, description: e.target.value })}
                      placeholder="Описание..."
                      className="w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={newRow.notes || ''}
                      onChange={(e) => setNewRow({ ...newRow, notes: e.target.value })}
                      placeholder="Дополнительные заметки..."
                      className="w-full px-2 py-1 border border-green-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-charcoal-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={saveNewRow}
                        className="p-1.5 text-green-700 hover:bg-green-100 rounded transition-colors"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelNewRow}
                        className="p-1.5 text-red-700 hover:bg-red-100 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing Expenses */}
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">📊</div>
                      <p className="text-xl font-semibold text-charcoal-700">No expenses yet</p>
                      <p className="text-charcoal-500">Click "Add Expense" to create your first entry</p>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense, index) => {
                  const cellKey = (field: string) => `${expense.id}-${field}`;
                  const isSaving = (field: string) => savingCells.has(cellKey(field));

                  return (
                    <tr
                      key={expense.id}
                      className={`border-b border-cream-100 hover:bg-cream-25 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-cream-25/50'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-4">
                        {editingCell?.id === expense.id && editingCell?.field === 'date' ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="date"
                            defaultValue={expense.date}
                            onBlur={(e) => handleCellBlur(expense.id, 'date', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, expense.id, 'date', e.currentTarget.value)}
                            className="w-full px-2 py-1 border border-brown-300 rounded focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'date')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer text-sm"
                          >
                            {isSaving('date') ? (
                              <span className="text-charcoal-400">Saving...</span>
                            ) : (
                              formatDate(expense.date)
                            )}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        {editingCell?.id === expense.id && editingCell?.field === 'category' ? (
                          <select
                            ref={inputRef as React.RefObject<HTMLSelectElement>}
                            defaultValue={expense.category}
                            onBlur={(e) => handleCellBlur(expense.id, 'category', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, expense.id, 'category', e.currentTarget.value)}
                            className="w-full px-2 py-1 border border-brown-300 rounded focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                          >
                            {CATEGORY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'category')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer"
                          >
                            {isSaving('category') ? (
                              <span className="text-charcoal-400 text-sm">Saving...</span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brown-100 text-brown-800">
                                {CATEGORY_LABELS[expense.category] || expense.category}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4">
                        {editingCell?.id === expense.id && editingCell?.field === 'amount' ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="number"
                            step="0.01"
                            min="0.01"
                            defaultValue={expense.amount}
                            onBlur={(e) => handleCellBlur(expense.id, 'amount', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, expense.id, 'amount', e.currentTarget.value)}
                            className="w-full px-2 py-1 border border-brown-300 rounded focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm font-medium"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'amount')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer text-sm font-bold text-red-600"
                          >
                            {isSaving('amount') ? (
                              <span className="text-charcoal-400">Saving...</span>
                            ) : (
                              formatCurrency(expense.amount)
                            )}
                          </div>
                        )}
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4">
                        {editingCell?.id === expense.id && editingCell?.field === 'description' ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            defaultValue={expense.description}
                            onBlur={(e) => handleCellBlur(expense.id, 'description', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, expense.id, 'description', e.currentTarget.value)}
                            className="w-full px-2 py-1 border border-brown-300 rounded focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'description')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer text-sm font-medium text-charcoal-900"
                          >
                            {isSaving('description') ? (
                              <span className="text-charcoal-400">Saving...</span>
                            ) : (
                              expense.description
                            )}
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-4">
                        {editingCell?.id === expense.id && editingCell?.field === 'notes' ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="text"
                            defaultValue={expense.notes || ''}
                            onBlur={(e) => handleCellBlur(expense.id, 'notes', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, expense.id, 'notes', e.currentTarget.value)}
                            placeholder="Добавить заметки..."
                            className="w-full px-2 py-1 border border-brown-300 rounded focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                          />
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'notes')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer text-sm text-charcoal-500 min-h-[28px]"
                          >
                            {isSaving('notes') ? (
                              <span className="text-charcoal-400">Saving...</span>
                            ) : (
                              expense.notes || <span className="text-charcoal-300">Add notes...</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => setDeletingExpense(expense)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={!!deletingExpense}
        title="Удалить расход"
        message={`Вы уверены, что хотите удалить этот расход? Это действие нельзя отменить.`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDeleteExpense}
        onClose={() => setDeletingExpense(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
