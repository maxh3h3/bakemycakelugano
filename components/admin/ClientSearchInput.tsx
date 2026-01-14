'use client';

import { useState, useEffect, useRef } from 'react';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  preferredContact: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderDate: string | null;
}

interface ClientSearchInputProps {
  onClientSelect: (client: Client) => void;
  onCreateNew: () => void;
}

export default function ClientSearchInput({ onClientSelect, onCreateNew }: ClientSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search clients
  useEffect(() => {
    const searchClients = async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/clients/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.clients || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error searching clients:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchClients, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleSelect = (client: Client) => {
    onClientSelect(client);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    onCreateNew();
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex === results.length) {
          handleCreateNew();
        } else if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const getPreferredContactIcon = (preferredContact: string | null) => {
    switch (preferredContact) {
      case 'email':
        return '📧';
      case 'phone':
        return '📞';
      case 'whatsapp':
        return '💬';
      case 'instagram':
        return '📸';
      default:
        return '👤';
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search clients by name, email, or phone..."
          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-cream-300 focus:border-brown-500 focus:outline-none text-base"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brown-500"></div>
          ) : (
            <svg className="w-5 h-5 text-charcoal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (results.length > 0 || query.length >= 2) && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-cream-300 rounded-xl shadow-xl max-h-96 overflow-y-auto">
          {/* Search Results */}
          {results.length > 0 ? (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-charcoal-500 uppercase tracking-wide">
                Existing Clients
              </div>
              {results.map((client, index) => (
                <button
                  key={client.id}
                  onClick={() => handleSelect(client)}
                  className={`w-full px-4 py-3 text-left hover:bg-cream-50 transition-colors flex items-center justify-between ${
                    selectedIndex === index ? 'bg-cream-100' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getPreferredContactIcon(client.preferredContact)}</span>
                      <p className="font-semibold text-charcoal-900">{client.name}</p>
                    </div>
                    <div className="text-sm text-charcoal-600">
                      {client.email || client.phone || client.instagramHandle}
                      {client.totalOrders > 0 && (
                        <span className="ml-2 text-brown-600 font-medium">
                          • {client.totalOrders} order{client.totalOrders > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  {client.totalOrders > 0 && (
                    <div className="text-right text-sm">
                      <p className="font-bold text-brown-600">CHF {parseFloat(client.totalSpent).toFixed(2)}</p>
                      {client.lastOrderDate && (
                        <p className="text-xs text-charcoal-500">
                          Last: {new Date(client.lastOrderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-8 text-center text-charcoal-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-charcoal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm">No clients found matching "{query}"</p>
            </div>
          ) : null}

          {/* Create New Option */}
          <div className="border-t-2 border-cream-200">
            <button
              onClick={handleCreateNew}
              className={`w-full px-4 py-3 text-left hover:bg-brown-50 transition-colors flex items-center gap-3 ${
                selectedIndex === results.length ? 'bg-brown-50' : ''
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-brown-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-brown-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-brown-700">Create New Client</p>
                <p className="text-sm text-brown-600">Add a new customer to the system</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
