'use client';

import { useState } from 'react';
import t from '@/lib/admin-translations-extended';
import { User, Briefcase } from 'lucide-react';

interface ClientFormProps {
  onSubmit: (data: ClientFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: ClientFormData;
  isLoading?: boolean;
}

export interface ClientFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  instagram_handle: string;
  preferred_contact: string;
  notes: string;
  client_type: 'individual' | 'business';
}

export default function ClientForm({ onSubmit, onCancel, initialData, isLoading = false }: ClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>(
    initialData || {
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      instagram_handle: '',
      preferred_contact: '',
      notes: '',
      client_type: 'individual',
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Имя обязательно';
    }

    // Contact details are now optional - removed validation requirement

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Client Type */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-700 mb-2">
          Тип клиента <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, client_type: 'individual' })}
            className={`px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
              formData.client_type === 'individual'
                ? 'bg-brown-500 text-white border-brown-500'
                : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-5 h-5" />
              Физическое лицо
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, client_type: 'business' })}
            className={`px-4 py-3 rounded-xl font-semibold transition-all border-2 ${
              formData.client_type === 'business'
                ? 'bg-brown-500 text-white border-brown-500'
                : 'bg-white text-charcoal-700 border-cream-300 hover:border-brown-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Briefcase className="w-5 h-5" />
              Бизнес
            </div>
          </button>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-700 mb-2">
          {t.name} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
          placeholder="Полное имя"
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Contact Methods */}
      <div className="border-2 border-cream-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-charcoal-700 mb-4">
          Способы связи
          <span className="ml-2 text-xs text-charcoal-500 font-normal">(необязательно)</span>
        </p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-charcoal-700 mb-2">📧 Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-charcoal-700 mb-2">📞 Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                placeholder="+41 XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-charcoal-700 mb-2">💬 WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
                placeholder="+41 XX XXX XX XX"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-charcoal-700 mb-2">📸 Instagram</label>
            <input
              type="text"
              value={formData.instagram_handle}
              onChange={(e) => setFormData({ ...formData, instagram_handle: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
              placeholder="@username"
            />
          </div>
        </div>
      </div>

      {/* Preferred Contact */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-700 mb-2">{t.preferredContact}</label>
        <select
          value={formData.preferred_contact}
          onChange={(e) => setFormData({ ...formData, preferred_contact: e.target.value })}
          className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
        >
          <option value="">Автоопределение из заказов</option>
          <option value="email">📧 Email</option>
          <option value="phone">📞 Телефон</option>
          <option value="whatsapp">💬 WhatsApp</option>
          <option value="instagram">📸 Instagram</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-700 mb-2">Внутренние примечания</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 rounded-lg border-2 border-cream-300 focus:border-brown-500 focus:outline-none"
          placeholder="Добавьте любые внутренние примечания о клиенте..."
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? t.saving : initialData ? 'Обновить клиента' : 'Создать клиента'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-400 transition-colors disabled:opacity-50"
        >
          {t.cancel}
        </button>
      </div>
    </form>
  );
}
