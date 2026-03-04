'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Trash2, Save, X, Search, Filter } from 'lucide-react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';
import DatePicker from '@/components/products/DatePicker';
import { format } from 'date-fns';

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: string;
  description: string;
}

const CATEGORY_OPTIONS = [
  { value: 'ingredients', label: '🥚 Ингредиенты', emoji: '🥚' },
  { value: 'utilities', label: '⚡ Коммунальные услуги', emoji: '⚡' },
  { value: 'labor', label: '👨‍🍳 Зарплаты', emoji: '👨‍🍳' },
  { value: 'supplies', label: '📦 Упаковка', emoji: '📦' },
  { value: 'consumables', label: '🧻 Расходные материалы', emoji: '🧻' },
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
  const [newRowDate, setNewRowDate] = useState<Date | undefined>(new Date());
  const [editingDate, setEditingDate] = useState<Date | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(() => new Date());

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
      console.error('Ошибка загрузки расходов:', error);
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
        alert('Не удалось обновить расход');
      }
    } catch (error) {
      console.error('Ошибка обновления расхода:', error);
      alert('Не удалось обновить расход');
    } finally {
      setSavingCells((prev) => {
        const newSet = new Set(prev);
        newSet.delete(cellKey);
        return newSet;
      });
    }
  };

  const handleCellClick = (id: string, field: string) => {
    if (field === 'date') {
      const expense = expenses.find((e) => e.id === id);
      if (expense) {
        setEditingDate(new Date(expense.date));
      }
    }
    setEditingCell({ id, field });
  };

  const handleCellBlur = (id: string, field: string, value: string) => {
    const expense = expenses.find((e) => e.id === id);
    if (expense && expense[field as keyof Expense] !== value) {
      updateExpense(id, field, value);
    }
    setEditingCell(null);
  };

  const handleDateChange = (id: string, date: Date | undefined) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      updateExpense(id, 'date', formattedDate);
    }
    setEditingCell(null);
    setEditingDate(undefined);
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
        alert('Не удалось удалить расход');
      }
    } catch (error) {
      console.error('Ошибка удаления расхода:', error);
      alert('Не удалось удалить расход');
    } finally {
      setIsDeleting(false);
    }
  };

  const startNewRow = () => {
    const today = new Date();
    setNewRowDate(today);
    setNewRow({
      date: format(today, 'yyyy-MM-dd'),
      category: 'ingredients',
      amount: '',
      description: '',
    });
  };

  const saveNewRow = async () => {
    if (!newRow || !newRow.amount || !newRow.description) {
      alert('Сумма и описание обязательны');
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
        setNewRowDate(undefined);
      } else {
        alert('Не удалось создать расход');
      }
    } catch (error) {
      console.error('Ошибка создания расхода:', error);
      alert('Не удалось создать расход');
    }
  };

  const cancelNewRow = () => {
    setNewRow(null);
    setNewRowDate(undefined);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'CHF',
    }).format(parseFloat(amount));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Helper: Monday 00:00:00 of current week
  const getWeekStart = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Helper: Sunday 23:59:59.999 of current week (end of full week)
  const getWeekEnd = () => {
    const start = getWeekStart();
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

    let matchesDate = true;
    if (dateFilter !== 'all') {
      const expenseDate = new Date(expense.date);
      const now = new Date();

      if (dateFilter === 'week') {
        // Full week: Monday through Sunday of current week
        const weekStart = getWeekStart();
        const weekEnd = getWeekEnd();
        expenseDate.setHours(0, 0, 0, 0);
        matchesDate = expenseDate >= weekStart && expenseDate <= weekEnd;
      } else if (dateFilter === 'month') {
        // Full month: 1st through last day of current month
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        firstOfMonth.setHours(0, 0, 0, 0);
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastOfMonth.setHours(23, 59, 59, 999);
        matchesDate = expenseDate >= firstOfMonth && expenseDate <= lastOfMonth;
      } else if (dateFilter === 'year') {
        const currentYear = now.getFullYear();
        matchesDate = expenseDate.getFullYear() === currentYear;
      } else if (dateFilter === 'custom' && customDateFrom && customDateTo) {
        const rangeStart = new Date(customDateFrom);
        rangeStart.setHours(0, 0, 0, 0);
        const rangeEnd = new Date(customDateTo);
        rangeEnd.setHours(23, 59, 59, 999);
        expenseDate.setHours(0, 0, 0, 0);
        matchesDate = expenseDate >= rangeStart && expenseDate <= rangeEnd;
      }
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  // Allow any past date for expenses (no minimum)
  const minDate = new Date('2000-01-01');
  const maxDate = new Date();

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
            <p className="text-sm font-medium text-charcoal-600 mb-1">Общая сумма расходов</p>
            <p className="text-4xl font-bold text-brown-700">
              {formatCurrency(totalExpenses.toString())}
            </p>
            <p className="text-sm text-charcoal-500 mt-1">
              {filteredExpenses.length} из {expenses.length} {expenses.length === 1 ? 'расход' : expenses.length < 5 ? 'расхода' : 'расходов'}
            </p>
          </div>
          <button
            onClick={startNewRow}
            className="flex items-center gap-2 px-6 py-3 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Добавить расход
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-charcoal-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Поиск по описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-cream-300 rounded-lg focus:border-brown-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border-2 border-cream-300 rounded-lg focus:border-brown-500 focus:outline-none font-semibold text-sm"
            >
              <option value="all">Все категории</option>
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setDateFilter('week')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'week'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'month'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Месяц
            </button>
            <button
              onClick={() => setDateFilter('year')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'year'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Год
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Период
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                dateFilter === 'all'
                  ? 'bg-brown-500 text-white'
                  : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
              }`}
            >
              Все
            </button>
            {dateFilter === 'custom' && (
              <div className="flex flex-wrap items-end gap-3 ml-2">
                <div className="w-44">
                  <DatePicker
                    selectedDate={customDateFrom}
                    onDateChange={setCustomDateFrom}
                    locale="ru"
                    minDate={minDate}
                    label="С"
                    placeholder="С даты"
                    showHelperText={false}
                  />
                </div>
                <div className="w-44">
                  <DatePicker
                    selectedDate={customDateTo}
                    onDateChange={setCustomDateTo}
                    locale="ru"
                    minDate={customDateFrom ?? minDate}
                    label="По"
                    placeholder="По дату"
                    showHelperText={false}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-cream-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-cream-50 border-b-2 border-cream-200">
              <tr>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-40">
                  Дата
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-48">
                  Категория
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700 w-32">
                  Сумма
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-charcoal-700">
                  Описание
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-charcoal-700 w-20">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {/* New Row */}
              {newRow && (
                <tr className="bg-green-50 border-b border-green-200 animate-fade-in">
                  <td className="py-2 px-4">
                    <div className="w-full">
                      <DatePicker
                        selectedDate={newRowDate}
                        onDateChange={(date) => {
                          setNewRowDate(date);
                          if (date) {
                            setNewRow({ ...newRow, date: format(date, 'yyyy-MM-dd') });
                          }
                        }}
                        locale="ru"
                        minDate={minDate}
                        label=""
                        placeholder="Выберите дату"
                        showHelperText={false}
                      />
                    </div>
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
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={saveNewRow}
                        className="p-1.5 text-green-700 hover:bg-green-100 rounded transition-colors"
                        title="Сохранить"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelNewRow}
                        className="p-1.5 text-red-700 hover:bg-red-100 rounded transition-colors"
                        title="Отмена"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Existing Expenses */}
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="text-5xl">📊</div>
                      <p className="text-xl font-semibold text-charcoal-700">
                        {expenses.length === 0 ? 'Расходов пока нет' : 'Расходы не найдены'}
                      </p>
                      <p className="text-charcoal-500">
                        {expenses.length === 0 
                          ? 'Нажмите "Добавить расход" чтобы создать первую запись'
                          : 'Попробуйте изменить фильтры'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense, index) => {
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
                          <div className="w-full">
                            <DatePicker
                              selectedDate={editingDate}
                              onDateChange={(date) => handleDateChange(expense.id, date)}
                              locale="ru"
                              minDate={minDate}
                              label=""
                              placeholder="Выберите дату"
                              showHelperText={false}
                            />
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellClick(expense.id, 'date')}
                            className="px-2 py-1 rounded hover:bg-brown-50 cursor-pointer text-sm"
                          >
                            {isSaving('date') ? (
                              <span className="text-charcoal-400">Сохранение...</span>
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
                              <span className="text-charcoal-400 text-sm">Сохранение...</span>
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
                              <span className="text-charcoal-400">Сохранение...</span>
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
                              <span className="text-charcoal-400">Сохранение...</span>
                            ) : (
                              expense.description
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
                            title="Удалить расход"
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
