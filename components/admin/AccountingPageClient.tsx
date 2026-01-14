'use client';

import { useState } from 'react';
import AccountingSummary from '@/components/admin/AccountingSummary';
import ExpensesTable from '@/components/admin/ExpensesTable';
import ExpenseModal from '@/components/admin/ExpenseModal';
import Button from '@/components/ui/Button';
import type { Expense } from '@/lib/db/schema';

type TabType = 'dashboard' | 'expenses';

export default function AccountingPageClient() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleExpenseSaved = () => {
    setIsAddingExpense(false);
    setEditingExpense(null);
    setRefreshTrigger((prev) => prev + 1); // Trigger refresh
  };

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-heading font-bold text-charcoal-900 mb-2">
                Accounting
              </h1>
              <p className="text-charcoal-600">
                Track expenses, revenue, and financial performance
              </p>
            </div>
            <Button
              onClick={() => setIsAddingExpense(true)}
              variant="primary"
              size="lg"
            >
              + Add Expense
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-cream-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-brown-500 text-brown-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-700 hover:border-charcoal-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'expenses'
                  ? 'border-brown-500 text-brown-600'
                  : 'border-transparent text-charcoal-500 hover:text-charcoal-700 hover:border-charcoal-300'
              }`}
            >
              💰 Expenses
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <AccountingSummary refreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTable
            refreshTrigger={refreshTrigger}
            onEditExpense={setEditingExpense}
          />
        )}

        {/* Modals */}
        {(isAddingExpense || editingExpense) && (
          <ExpenseModal
            expense={editingExpense}
            onClose={() => {
              setIsAddingExpense(false);
              setEditingExpense(null);
            }}
            onSave={handleExpenseSaved}
          />
        )}
      </div>
    </div>
  );
}
