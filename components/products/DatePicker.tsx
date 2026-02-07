'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS, it, ru } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  locale: string;
  required?: boolean;
  minDate?: Date;
  label?: string;
  placeholder?: string;
  helpText?: string;
  leadTimeText?: string;
  showHelperText?: boolean;
}

const localeMap = {
  en: enUS,
  it: it,
  ru: ru,
};

export default function DatePicker({
  selectedDate,
  onDateChange,
  locale,
  required = false,
  minDate: customMinDate,
  label,
  placeholder,
  helpText,
  leadTimeText,
  showHelperText = true,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const defaultCopyByLocale: Record<
    string,
    Record<'deliveryDate' | 'selectDate' | 'datePickerHelp' | 'leadTime', string>
  > = {
    en: {
      deliveryDate: 'Delivery date',
      selectDate: 'Select a date',
      datePickerHelp: 'Minimum lead time — 2 days',
      leadTime: 'To ensure quality, we require at least 2 days notice',
    },
    it: {
      deliveryDate: 'Data di consegna',
      selectDate: 'Seleziona una data',
      datePickerHelp: 'Preavviso minimo — 2 giorni',
      leadTime: 'Per garantire la qualità, richiediamo almeno 2 giorni di preavviso',
    },
    // Admin-only fallback (no next-intl provider on /admin routes)
    ru: {
      deliveryDate: 'Дата доставки',
      selectDate: 'Выберите дату',
      datePickerHelp: 'Минимальный срок — 2 дня',
      leadTime: 'Для обеспечения качества требуется минимум 2 дня',
    },
  };

  // Use custom strings if provided (e.g. admin pages), otherwise use a locale-based fallback.
  const getLabel = (key: string) => {
    if (label && key === 'deliveryDate') return label;
    if (placeholder && key === 'selectDate') return placeholder;
    if (helpText && key === 'datePickerHelp') return helpText;
    if (leadTimeText && key === 'leadTime') return leadTimeText;
    
    const defaults = defaultCopyByLocale[locale] || defaultCopyByLocale.en;
    return (defaults as Record<string, string>)[key] || '';
  };

  // Calculate minimum date (2 days from now by default - no same-day or next-day orders for customers)
  // But allow override for admin orders
  const defaultMinDate = new Date();
  defaultMinDate.setDate(defaultMinDate.getDate() + 2); // Day after tomorrow
  defaultMinDate.setHours(0, 0, 0, 0);

  const minDate = customMinDate || defaultMinDate;

  // Maximum date (3 months in advance)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  // Disable only past dates and dates beyond 3 months
  const disabledDays = [
    { before: minDate },
    { after: maxDate },
  ];

  const dateLocale = localeMap[locale as keyof typeof localeMap] || enUS;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
        {getLabel('deliveryDate')} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {/* Date Input Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-4 py-2 rounded-lg border-2 transition-colors text-left
            flex items-center justify-between
            focus:outline-none focus:border-brown-500
            ${
              selectedDate
                ? 'border-cream-300 bg-white text-charcoal-900'
                : 'border-cream-300 bg-white text-charcoal-500 hover:border-brown-500'
            }
          `}
        >
          <span className="font-medium">
            {selectedDate ? format(selectedDate, 'PPP', { locale: dateLocale }) : getLabel('selectDate')}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5 text-brown-500"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </button>

        {/* Calendar Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Calendar */}
            <div className="absolute top-full left-0 mt-2 z-20 bg-white rounded-lg shadow-xl border-2 border-cream-200 p-4">
              <style jsx global>{`
                .rdp {
                  --rdp-cell-size: 40px;
                  --rdp-accent-color: #8b6b47;
                  --rdp-background-color: #f9f6f1;
                  margin: 0;
                }
                
                .rdp-caption {
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  padding: 0 0 1rem 0;
                }
                
                .rdp-caption_label {
                  font-size: 1rem;
                  font-weight: 600;
                  color: #2c2c2c;
                }
                
                .rdp-nav_button {
                  width: 32px;
                  height: 32px;
                  border-radius: 8px;
                  border: none;
                  background: transparent;
                  transition: background-color 0.2s;
                }
                
                .rdp-nav_button:hover {
                  background-color: var(--rdp-background-color);
                }
                
                .rdp-head_cell {
                  color: #8b6b47;
                  font-weight: 600;
                  font-size: 0.75rem;
                  text-transform: uppercase;
                }
                
                .rdp-cell {
                  padding: 2px;
                }
                
                .rdp-button {
                  border-radius: 8px;
                  font-weight: 500;
                  border: 2px solid transparent;
                  transition: all 0.2s;
                }
                
                .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
                  background-color: var(--rdp-background-color);
                }
                
                .rdp-day_selected {
                  background-color: var(--rdp-accent-color);
                  color: white;
                  font-weight: 700;
                }
                
                .rdp-day_disabled {
                  opacity: 0.3;
                  cursor: not-allowed;
                }
                
                .rdp-day_today:not(.rdp-day_selected) {
                  border-color: var(--rdp-accent-color);
                  color: var(--rdp-accent-color);
                  font-weight: 600;
                }
              `}</style>
              
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={(date: Date | undefined) => {
                  onDateChange(date);
                  setIsOpen(false);
                }}
                disabled={disabledDays}
                locale={dateLocale}
                required={required}
              />
              
              {/* Helper text - only show if using default 2-day minimum and showHelperText is true */}
              {!customMinDate && showHelperText && (
                <div className="mt-3 pt-3 border-t border-cream-200">
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    {getLabel('datePickerHelp')}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Info text - only show if using default 2-day minimum and showHelperText is true */}
      {!customMinDate && showHelperText && (
        <p className="text-xs text-charcoal-600">
          {getLabel('leadTime')}
        </p>
      )}
    </div>
  );
}

