'use client';

import { useState } from 'react';
import InlineExpensesTable from '@/components/admin/InlineExpensesTable';
import FinancialDashboard from '@/components/admin/FinancialDashboard';
import AllTransactionsTable from '@/components/admin/AllTransactionsTable';
import RevenuesTable from '@/components/admin/RevenuesTable';
import t from '@/lib/admin-translations-extended';
import { BarChart3, List, TrendingDown, TrendingUp } from 'lucide-react';

type TabType = 'dashboard' | 'all' | 'expenses' | 'revenues';

export default function AccountingPageClient() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div className="min-h-screen bg-cream-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-heading font-bold text-charcoal-900 mb-2">
            💰 {t.accounting}
          </h1>
          <p className="text-charcoal-600">
            Управление финансами, отслеживание доходов и расходов
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-2xl shadow-md p-2 mb-6">
          <div className="grid grid-cols-4 gap-2">
            {/* Dashboard Tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-brown-500 text-white shadow-lg'
                  : 'bg-white text-charcoal-700 hover:bg-cream-50'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Панель управления</span>
            </button>

            {/* All Transactions Tab */}
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'all'
                  ? 'bg-brown-500 text-white shadow-lg'
                  : 'bg-white text-charcoal-700 hover:bg-cream-50'
              }`}
            >
              <List className="w-5 h-5" />
              <span>Все транзакции</span>
            </button>

            {/* Expenses Tab */}
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'expenses'
                  ? 'bg-brown-500 text-white shadow-lg'
                  : 'bg-white text-charcoal-700 hover:bg-cream-50'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span>Расходы</span>
            </button>

            {/* Revenues Tab */}
            <button
              onClick={() => setActiveTab('revenues')}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
                activeTab === 'revenues'
                  ? 'bg-brown-500 text-white shadow-lg'
                  : 'bg-white text-charcoal-700 hover:bg-cream-50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span>Выручка</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <FinancialDashboard />}
          {activeTab === 'all' && <AllTransactionsTable />}
          {activeTab === 'expenses' && <InlineExpensesTable />}
          {activeTab === 'revenues' && <RevenuesTable />}
        </div>
      </div>

      {/* Fade-in animation */}
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
    </div>
  );
}
