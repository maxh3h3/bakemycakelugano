'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { useTranslations } from 'next-intl';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  selectedDate: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  locale: string;
  required?: boolean;
}

const localeMap = {
  en: enUS,
  it: it,
};

export default function DatePicker({
  selectedDate,
  onDateChange,
  locale,
  required = false,
}: DatePickerProps) {
  const t = useTranslations('productDetail');
  const [isOpen, setIsOpen] = useState(false);

  // Calculate minimum date (tomorrow - no same-day orders)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Tomorrow
  minDate.setHours(0, 0, 0, 0);

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
      <label className="block text-sm font-medium text-charcoal-900">
        {t('deliveryDate')} {required && <span className="text-rose-500">*</span>}
      </label>
      
      <div className="relative">
        {/* Date Input Display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full px-4 py-3 rounded-lg border-2 transition-colors text-left
            flex items-center justify-between
            focus:outline-none focus:ring-2 focus:ring-brown-500/20
            ${
              selectedDate
                ? 'border-brown-500 bg-white text-charcoal-900'
                : 'border-cream-200 bg-white text-charcoal-900/50 hover:border-brown-300'
            }
          `}
        >
          <span className="font-medium">
            {selectedDate ? format(selectedDate, 'PPP', { locale: dateLocale }) : t('selectDate')}
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
              
              {/* Helper text */}
              <div className="mt-3 pt-3 border-t border-cream-200">
                <p className="text-xs text-charcoal-900/60 leading-relaxed">
                  {t('datePickerHelp')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Info text */}
      <p className="text-xs text-charcoal-900/60">
        {t('leadTime')}
      </p>
    </div>
  );
}

