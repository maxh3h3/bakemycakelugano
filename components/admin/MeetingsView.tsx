'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Plus, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ClientSearchInput from '@/components/admin/ClientSearchInput';
import DatePicker from '@/components/products/DatePicker';
import { formatDateForDB } from '@/lib/utils';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  preferredContact: string | null;
  totalOrders?: number;
  totalSpent?: string;
  lastOrderDate?: string | null;
}

interface Meeting {
  id: string;
  meeting_date: string;
  meeting_time: string;
  client_id: string | null;
  clients: Client | null;
  created_at: string;
  updated_at: string;
}

export default function MeetingsView() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    meeting_time: '',
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_ig_handle: '',
    channel: 'phone' as 'phone' | 'whatsapp' | 'instagram' | 'email',
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch meetings
  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/admin/meetings');
      const data = await response.json();
      if (data.success) {
        setMeetings(data.meetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    // Pre-fill form with client data
    setFormData(prev => ({
      ...prev,
      customer_name: client.name,
      customer_email: client.email || '',
      customer_phone: client.phone || '',
      customer_ig_handle: client.instagramHandle || '',
      channel: client.preferredContact === 'instagram' ? 'instagram' :
               client.preferredContact === 'email' ? 'email' :
               client.preferredContact === 'whatsapp' ? 'whatsapp' :
               'phone',
    }));
  };

  const handleCreateNewClient = () => {
    // Clear selection to show manual input fields
    setSelectedClient(null);
    setFormData(prev => ({
      ...prev,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_ig_handle: '',
    }));
  };

  const handleClearClientSelection = () => {
    setSelectedClient(null);
    setFormData(prev => ({
      ...prev,
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_ig_handle: '',
    }));
  };

  // Handle create meeting
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date is selected
    if (!meetingDate) {
      alert('Пожалуйста, выберите дату встречи');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/admin/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_date: formatDateForDB(meetingDate),
          meeting_time: formData.meeting_time,
          client_id: selectedClient?.id || null,
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          customer_ig_handle: formData.customer_ig_handle,
          channel: formData.channel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowAddModal(false);
        setMeetingDate(undefined);
        setFormData({
          meeting_time: '',
          customer_name: '',
          customer_email: '',
          customer_phone: '',
          customer_ig_handle: '',
          channel: 'phone',
        });
        setSelectedClient(null);
        fetchMeetings();
        router.refresh();
      } else {
        alert('Не удалось создать встречу: ' + data.error);
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      alert('Не удалось создать встречу');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete meeting
  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту встречу?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/meetings/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchMeetings();
        router.refresh();
      } else {
        alert('Не удалось удалить встречу: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('Не удалось удалить встречу');
    }
  };

  // Group meetings by date
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const date = meeting.meeting_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, Meeting[]>);

  const sortedDates = Object.keys(groupedMeetings).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-charcoal-500">Загрузка встреч...</div>
      </div>
    );
  }

  return (
    <>
      {/* Add Meeting Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-brown-500 hover:bg-brown-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Добавить встречу
        </button>
      </div>

      {/* Meetings List */}
      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-charcoal-400 mb-4" />
          <h2 className="text-2xl font-heading font-bold text-charcoal-900 mb-2">
            Нет запланированных встреч
          </h2>
          <p className="text-charcoal-600 mb-6">
            Нажмите кнопку "Добавить встречу", чтобы запланировать первую встречу.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((date) => {
            const dateMeetings = groupedMeetings[date];
            const isPast = new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <div key={date} className="bg-white rounded-2xl shadow-md border-2 border-cream-200 p-6">
                <h2 className={`text-xl font-heading font-bold mb-4 ${isPast ? 'text-charcoal-400' : 'text-brown-500'}`}>
                  {format(new Date(date + 'T00:00:00'), 'EEEE, d MMMM yyyy', { locale: ru })}
                </h2>
                <div className="space-y-3">
                  {dateMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isPast
                          ? 'border-gray-200 bg-gray-50 opacity-60'
                          : 'border-cream-300 hover:border-brown-400 hover:bg-cream-50'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {/* Time */}
                        <div className="flex items-center gap-2 text-charcoal-700">
                          <Clock className="w-5 h-5 text-brown-500" />
                          <span className="font-mono font-semibold text-lg">
                            {meeting.meeting_time}
                          </span>
                        </div>

                        {/* Client */}
                        <div className="flex items-center gap-2 flex-1">
                          <User className="w-5 h-5 text-purple-600" />
                          {meeting.clients ? (
                            <div>
                              <p className="font-semibold text-charcoal-900">
                                {meeting.clients.name}
                              </p>
                              <p className="text-sm text-charcoal-500">
                                {meeting.clients.phone || meeting.clients.email || 'Нет контактной информации'}
                              </p>
                            </div>
                          ) : (
                            <span className="text-charcoal-500 italic">Клиент не назначен</span>
                          )}
                        </div>
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Удалить встречу"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brown-500 to-brown-600 text-white p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-heading font-bold">Добавить встречу</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              {/* Date */}
              <DatePicker
                selectedDate={meetingDate}
                onDateChange={setMeetingDate}
                locale="en"
                required
                minDate={new Date()} // Allow meetings from today onwards
                label="Дата встречи"
                placeholder="Выберите дату"
                showHelperText={false}
              />

              {/* Time */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                  Время *
                </label>
                <input
                  type="text"
                  value={formData.meeting_time}
                  onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
                  placeholder="напр., 14:30 или 2:30pm"
                  required
                  className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:border-brown-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Client Selection */}
              <div>
                <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                  Клиент
                </label>
                
                {/* Client Search */}
                <div className="mb-4">
                  <ClientSearchInput
                    onClientSelect={handleClientSelect}
                    onCreateNew={handleCreateNewClient}
                  />
                </div>
                
                {/* Selected Client Display */}
                {selectedClient && (
                  <div className="mb-4 bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-green-900">{selectedClient.name}</p>
                      <p className="text-sm text-green-700">
                        {selectedClient.email || selectedClient.phone || selectedClient.instagramHandle}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearClientSelection}
                      className="text-green-700 hover:text-green-900 hover:bg-green-100 p-2 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                {/* Manual Client Input (shown when no client selected) */}
                {!selectedClient && (
                  <div className="space-y-4">
                    {/* Customer Name */}
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Имя *
                      </label>
                      <input
                        type="text"
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        placeholder="Имя клиента"
                        required
                        className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:border-brown-500 focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Contact Channel */}
                    <div>
                      <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                        Канал связи
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, channel: 'phone' })}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            formData.channel === 'phone'
                              ? 'bg-brown-500 border-brown-500 text-white shadow-lg'
                              : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300'
                          }`}
                        >
                          <span className="text-2xl mb-1">📞</span>
                          <span className="text-xs font-semibold">Телефон</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, channel: 'whatsapp' })}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            formData.channel === 'whatsapp'
                              ? 'bg-brown-500 border-brown-500 text-white shadow-lg'
                              : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300'
                          }`}
                        >
                          <span className="text-2xl mb-1">💬</span>
                          <span className="text-xs font-semibold">WhatsApp</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, channel: 'instagram' })}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            formData.channel === 'instagram'
                              ? 'bg-brown-500 border-brown-500 text-white shadow-lg'
                              : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300'
                          }`}
                        >
                          <span className="text-2xl mb-1">📸</span>
                          <span className="text-xs font-semibold">Instagram</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, channel: 'email' })}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                            formData.channel === 'email'
                              ? 'bg-brown-500 border-brown-500 text-white shadow-lg'
                              : 'bg-white border-cream-300 text-charcoal-700 hover:border-brown-300'
                          }`}
                        >
                          <span className="text-2xl mb-1">📧</span>
                          <span className="text-xs font-semibold">Email</span>
                        </button>
                      </div>
                    </div>

                    {/* Conditional Contact Info */}
                    {(formData.channel === 'phone' || formData.channel === 'whatsapp') && (
                      <div>
                        <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                          Номер телефона
                        </label>
                        <input
                          type="tel"
                          value={formData.customer_phone}
                          onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                          placeholder="+41 XX XXX XX XX (необязательно)"
                          className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:border-brown-500 focus:outline-none transition-colors"
                        />
                      </div>
                    )}

                    {formData.channel === 'instagram' && (
                      <div>
                        <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                          Instagram аккаунт
                        </label>
                        <input
                          type="text"
                          value={formData.customer_ig_handle}
                          onChange={(e) => setFormData({ ...formData, customer_ig_handle: e.target.value })}
                          placeholder="@username (необязательно)"
                          className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:border-brown-500 focus:outline-none transition-colors"
                        />
                      </div>
                    )}

                    {formData.channel === 'email' && (
                      <div>
                        <label className="block text-sm font-semibold text-charcoal-700 mb-2">
                          Электронная почта
                        </label>
                        <input
                          type="email"
                          value={formData.customer_email}
                          onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                          placeholder="client@example.com (необязательно)"
                          className="w-full px-4 py-3 border-2 border-cream-300 rounded-xl focus:border-brown-500 focus:outline-none transition-colors"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 bg-cream-100 text-charcoal-700 rounded-xl font-semibold hover:bg-cream-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-brown-500 text-white rounded-xl font-semibold hover:bg-brown-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Создание...' : 'Создать встречу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
