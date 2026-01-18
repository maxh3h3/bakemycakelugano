// BUSINESS CONTEXT: Production Summary Calculator for Kitchen Staff
// Used by: Production team (admin role required)
// 
// Workflow: Provides aggregated view of all items to produce, grouped by:
// 1. Diameter + Flavour combination (for cake count planning)
// 2. Flavour weight totals (for ingredient preparation)
//
// Business Rules:
// - Three calculation modes:
//   1. "Daily" (from daily view): Shows today's items only, no mode switching
//   2. "Until Sunday" (from weekly view, default): From today until end of current week
//   3. "Next 7 Days" (from weekly view): Rolling 7-day window from today
// - Mode tabs only visible when opened from weekly view
// - Counts total quantity across all orders for each diameter+flavour combo
// - Sums weight_kg by flavour for ingredient planning
// - Helps kitchen staff plan batch production and ingredient orders
//
// Data Relationships: Aggregates order_items data filtered by delivery_date

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Database } from '@/lib/supabase/types';
import t from '@/lib/admin-translations-extended';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface ProductionSummaryModalProps {
  items: OrderItem[];
  viewMode: 'today' | 'week' | 'month';
  onClose: () => void;
}

interface DiameterFlavourGroup {
  flavour: string;
  diameter: number;
  count: number;
}

interface FlavourWeight {
  flavour: string;
  totalWeight: number;
}

type CalculationMode = 'daily' | 'until-sunday' | 'next-7-days';

export default function ProductionSummaryModal({ items, viewMode, onClose }: ProductionSummaryModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Initialize calculation mode based on view mode
  // Daily view → 'daily' mode (no switching allowed)
  // Weekly view → 'until-sunday' mode (switching allowed)
  const [calculationMode, setCalculationMode] = useState<CalculationMode>(
    viewMode === 'today' ? 'daily' : 'until-sunday'
  );

  // Determine if calculation mode tabs should be shown
  const showCalculationModeTabs = viewMode === 'week';

  // Filter items based on calculation mode
  const filteredItems = useMemo(() => {
    // Daily mode: items are already filtered by parent, no further filtering needed
    if (calculationMode === 'daily') {
      return items;
    }

    // Weekly modes: apply date range filtering
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    if (calculationMode === 'until-sunday') {
      // From today until the end of current week (Sunday)
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + daysUntilSunday);
      
      const todayStr = dateToLocalString(today);
      const endDateStr = dateToLocalString(endDate);
      
      return items.filter(item => {
        if (!item.delivery_date) return false;
        return item.delivery_date >= todayStr && item.delivery_date <= endDateStr;
      });
    } else {
      // next-7-days: From today + 6 days (7 days total)
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);
      
      const todayStr = dateToLocalString(today);
      const endDateStr = dateToLocalString(endDate);
      
      return items.filter(item => {
        if (!item.delivery_date) return false;
        return item.delivery_date >= todayStr && item.delivery_date <= endDateStr;
      });
    }
  }, [items, calculationMode]);

  // Helper function to convert Date to YYYY-MM-DD string
  function dateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Calculate diameter + flavour groups
  const diameterFlavourGroups = useMemo(() => {
    const groups = new Map<string, DiameterFlavourGroup>();

    filteredItems.forEach((item) => {
      // Skip items without diameter or flavour
      if (!item.diameter_cm || !item.flavour_name) return;

      const key = `${item.flavour_name}-${item.diameter_cm}`;
      
      if (!groups.has(key)) {
        groups.set(key, {
          flavour: item.flavour_name,
          diameter: item.diameter_cm,
          count: 0,
        });
      }
      
      // Add quantity to count (each order item can have multiple quantities)
      groups.get(key)!.count += item.quantity;
    });

    // Sort by diameter first, then by flavour
    return Array.from(groups.values()).sort((a, b) => {
      if (a.diameter !== b.diameter) {
        return a.diameter - b.diameter;
      }
      return a.flavour.localeCompare(b.flavour);
    });
  }, [filteredItems]);

  // Calculate total weight by flavour
  const flavourWeights = useMemo(() => {
    const weights = new Map<string, number>();

    filteredItems.forEach((item) => {
      // Skip items without weight or flavour
      if (!item.weight_kg || !item.flavour_name) return;

      const currentWeight = weights.get(item.flavour_name) || 0;
      weights.set(item.flavour_name, currentWeight + (item.weight_kg * item.quantity));
    });

    // Convert to array and sort by flavour name
    return Array.from(weights.entries())
      .map(([flavour, totalWeight]) => ({ flavour, totalWeight }))
      .sort((a, b) => a.flavour.localeCompare(b.flavour));
  }, [filteredItems]);

  const viewModeLabel = viewMode === 'today' ? 'Сегодня' : viewMode === 'week' ? 'Эта неделя' : 'Этот месяц';
  const calculationLabel = 
    calculationMode === 'daily' ? 'Только сегодня' :
    calculationMode === 'until-sunday' ? 'Сегодня → Конец недели' : 
    'Следующие 7 дней';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-heading font-bold text-white mb-1">
                Сводка производства
              </h2>
              <p className="text-brown-100 text-sm">
                {viewModeLabel} • {filteredItems.length} {filteredItems.length === 1 ? 'позиция' : 'позиций'} • {calculationLabel}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-4xl leading-none transition-colors"
              aria-label="Закрыть модальное окно"
            >
              ×
            </button>
          </div>
          
          {/* Calculation Mode Buttons - Only show for weekly view */}
          {showCalculationModeTabs && (
            <div className="flex gap-2">
              <button
                onClick={() => setCalculationMode('until-sunday')}
                className={`
                  flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200
                  ${calculationMode === 'until-sunday'
                    ? 'bg-white text-brown-600 shadow-lg'
                    : 'bg-brown-600/50 text-white hover:bg-brown-600/70'
                  }
                `}
              >
                Сегодня → Воскресенье
              </button>
              <button
                onClick={() => setCalculationMode('next-7-days')}
                className={`
                  flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200
                  ${calculationMode === 'next-7-days'
                    ? 'bg-white text-brown-600 shadow-lg'
                    : 'bg-brown-600/50 text-white hover:bg-brown-600/70'
                  }
                `}
              >
                Следующие 7 дней
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-8">
            {/* Section 1: Diameter + Flavour Groups */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-brown-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-brown-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-charcoal-900">
                    Торты по размеру и вкусу
                  </h3>
                  <p className="text-sm text-charcoal-500">
                    Всего тортов к производству, сгруппированных по диаметру и вкусу
                  </p>
                </div>
              </div>

              {diameterFlavourGroups.length === 0 ? (
                <div className="bg-cream-50 rounded-2xl border-2 border-cream-200 p-8 text-center">
                  <p className="text-charcoal-500">Нет тортов с информацией о диаметре и вкусе</p>
                </div>
              ) : (
                <div className="bg-cream-50 rounded-2xl border-2 border-cream-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {diameterFlavourGroups.map((group, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-4 border border-cream-300 flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brown-500 text-white flex items-center justify-center font-bold text-lg">
                            {group.diameter}
                          </div>
                          <div>
                            <p className="font-semibold text-charcoal-900 text-lg">
                              {group.flavour}
                            </p>
                            <p className="text-xs text-charcoal-500">
                              {group.diameter} см диаметр
                            </p>
                          </div>
                        </div>
                        <div className="bg-brown-100 px-4 py-2 rounded-lg">
                          <p className="text-2xl font-bold text-brown-700">
                            {group.count}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Weight by Flavour */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-emerald-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-heading font-bold text-charcoal-900">
                    Общий вес по вкусам
                  </h3>
                  <p className="text-sm text-charcoal-500">
                    Планирование подготовки ингредиентов
                  </p>
                </div>
              </div>

              {flavourWeights.length === 0 ? (
                <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-8 text-center">
                  <p className="text-charcoal-500">Нет позиций с информацией о весе</p>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-2xl border-2 border-emerald-200 p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {flavourWeights.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-5 border border-emerald-300 hover:shadow-md transition-shadow"
                      >
                        <p className="font-semibold text-charcoal-900 text-lg mb-2">
                          {item.flavour}
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-emerald-600">
                            {item.totalWeight.toFixed(1)}
                          </p>
                          <p className="text-lg text-charcoal-500">kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="bg-gradient-to-br from-brown-50 to-cream-50 rounded-2xl border-2 border-brown-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-sm text-charcoal-600 mb-2">Всего позиций</p>
                  <p className="text-3xl font-bold text-brown-600">{filteredItems.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-charcoal-600 mb-2">Всего тортов</p>
                  <p className="text-3xl font-bold text-brown-600">
                    {diameterFlavourGroups.reduce((sum, g) => sum + g.count, 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-charcoal-600 mb-2">Общий вес</p>
                  <p className="text-3xl font-bold text-brown-600">
                    {flavourWeights.reduce((sum, w) => sum + w.totalWeight, 0).toFixed(1)} кг
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream-50 px-8 py-4 border-t-2 border-cream-200">
          <button
            onClick={onClose}
            className="w-full bg-brown-500 hover:bg-brown-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
