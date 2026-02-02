// BUSINESS CONTEXT: Production PDF Generator for Kitchen Staff
// Used by: Production team (owner role required)
// 
// Workflow: Generates printable PDFs for production schedules in two modes:
// 1. Cooking Mode: Shows order_number, size, weight for baking staff
// 2. Decoration Mode: Shows order_number, photos, writing, notes for decorating staff
//
// Business Rules:
// - Two date range modes:
//   1. "Until Sunday": From today until end of current week
//   2. "Next 7 Days": Rolling 7-day window from today
// - Two print modes:
//   1. Cooking: Tabular format with baking details
//   2. Decoration: Card format with large embedded images and decoration notes
// - PDFs use Russian text natively (no transliteration needed)
// - PDFs are branded with logo and company colors
// - Large, prominent fonts matching production view aesthetic
// - Images are embedded as actual photos (not URLs)
//
// Data Relationships: Uses order_items data filtered by delivery_date

'use client';

import { useMemo, useState, useEffect } from 'react';
import type { Database } from '@/lib/supabase/types';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Printer, Download } from 'lucide-react';
import CookingModePDF from './pdf/CookingModePDF';
import DecorationModePDF from './pdf/DecorationModePDF';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface ProductionPrintingModalProps {
  items: OrderItem[];
  onClose: () => void;
}

type DateRangeMode = 'until-sunday' | 'next-7-days';
type PrintMode = 'cooking' | 'decoration';

export default function ProductionPrintingModal({ items, onClose }: ProductionPrintingModalProps) {
  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>('until-sunday');
  const [printMode, setPrintMode] = useState<PrintMode>('cooking');

  // Filter items based on date range mode
  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    if (dateRangeMode === 'until-sunday') {
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
  }, [items, dateRangeMode]);

  // Helper function to convert Date to YYYY-MM-DD string
  function dateToLocalString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Get date range label
  function getDateRangeLabel(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateRangeMode === 'until-sunday') {
      const dayOfWeek = today.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + daysUntilSunday);
      
      return `${dateToLocalString(today)} — ${dateToLocalString(endDate)}`;
    } else {
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + 6);
      
      return `${dateToLocalString(today)} — ${dateToLocalString(endDate)}`;
    }
  }

  // Get filename for PDF
  function getFilename(): string {
    const mode = printMode === 'cooking' ? 'Cooking' : 'Decoration';
    return `Production_${mode}_${dateToLocalString(new Date())}.pdf`;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-brown-500 to-brown-600 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-3xl font-heading font-bold text-white mb-1">
                Печать графика производства
              </h2>
              <p className="text-brown-100 text-sm">
                {filteredItems.length} {filteredItems.length === 1 ? 'позиция' : filteredItems.length < 5 ? 'позиции' : 'позиций'} • {getDateRangeLabel()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-4xl leading-none transition-colors"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="space-y-6">
            {/* Date Range Selection */}
            <div>
              <h3 className="text-lg font-semibold text-charcoal-900 mb-3">Период времени</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setDateRangeMode('until-sunday')}
                  className={`
                    flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200
                    ${dateRangeMode === 'until-sunday'
                      ? 'bg-brown-500 text-white shadow-lg'
                      : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                    }
                  `}
                >
                  Сегодня → Конец недели
                </button>
                <button
                  onClick={() => setDateRangeMode('next-7-days')}
                  className={`
                    flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-200
                    ${dateRangeMode === 'next-7-days'
                      ? 'bg-brown-500 text-white shadow-lg'
                      : 'bg-cream-100 text-charcoal-700 hover:bg-cream-200'
                    }
                  `}
                >
                  Следующие 7 дней
                </button>
              </div>
            </div>

            {/* Print Mode Selection */}
            <div>
              <h3 className="text-lg font-semibold text-charcoal-900 mb-3">Режим печати</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setPrintMode('cooking')}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200 text-left
                    ${printMode === 'cooking'
                      ? 'border-brown-500 bg-brown-50 shadow-md'
                      : 'border-cream-300 bg-white hover:border-brown-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${printMode === 'cooking' ? 'border-brown-500' : 'border-cream-400'}`}>
                      {printMode === 'cooking' && (
                        <div className="w-3 h-3 rounded-full bg-brown-500"></div>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-charcoal-900">Режим выпечки</h4>
                  </div>
                  <p className="text-sm text-charcoal-600 ml-8">
                    Номер заказа, размер, вес
                  </p>
                  <p className="text-xs text-charcoal-500 ml-8 mt-1">
                    Табличный формат для пекарей
                  </p>
                </button>

                <button
                  onClick={() => setPrintMode('decoration')}
                  className={`
                    p-6 rounded-xl border-2 transition-all duration-200 text-left
                    ${printMode === 'decoration'
                      ? 'border-brown-500 bg-brown-50 shadow-md'
                      : 'border-cream-300 bg-white hover:border-brown-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                      ${printMode === 'decoration' ? 'border-brown-500' : 'border-cream-400'}`}>
                      {printMode === 'decoration' && (
                        <div className="w-3 h-3 rounded-full bg-brown-500"></div>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-charcoal-900">Режим декора</h4>
                  </div>
                  <p className="text-sm text-charcoal-600 ml-8">
                    Фото, надписи, заметки
                  </p>
                  <p className="text-xs text-charcoal-500 ml-8 mt-1">
                    Формат карточек с большими изображениями
                  </p>
                </button>
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-cream-50 rounded-2xl border-2 border-cream-200 p-6">
              <h3 className="text-lg font-semibold text-charcoal-900 mb-3">Предпросмотр</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-charcoal-600">Период:</span>
                  <span className="font-semibold text-charcoal-900">{getDateRangeLabel()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-600">Режим:</span>
                  <span className="font-semibold text-charcoal-900">
                    {printMode === 'cooking' ? 'Выпечка' : 'Декор'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-charcoal-600">Всего позиций:</span>
                  <span className="font-semibold text-charcoal-900">{filteredItems.length}</span>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {filteredItems.length === 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 text-center">
                <p className="text-yellow-800 font-semibold">Нет позиций в выбранном периоде</p>
                <p className="text-yellow-700 text-sm mt-1">Попробуйте выбрать другой период</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-cream-50 px-8 py-4 border-t-2 border-cream-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-white border-2 border-cream-300 hover:bg-cream-100 text-charcoal-700 font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Отмена
          </button>
          
          {filteredItems.length === 0 ? (
            <button
              disabled
              className="flex-1 bg-brown-500 text-white font-semibold py-3 px-6 rounded-xl opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Создать PDF
            </button>
          ) : (
            <PDFDownloadLink
              document={
                printMode === 'cooking' 
                  ? <CookingModePDF items={filteredItems} dateRange={getDateRangeLabel()} />
                  : <DecorationModePDF items={filteredItems} dateRange={getDateRangeLabel()} />
              }
              fileName={getFilename()}
              className="flex-1 bg-brown-500 hover:bg-brown-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {({ loading }) => (
                loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Создание...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Скачать PDF
                  </>
                )
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>
    </div>
  );
}
