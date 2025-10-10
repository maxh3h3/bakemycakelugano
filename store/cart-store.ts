import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/types/sanity';

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string; // Size value (e.g., "1kg")
  deliveryDate?: string; // ISO date string
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity: number, selectedSize?: string, deliveryDate?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateDeliveryDate: (itemId: string, date: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemPrice: (item: CartItem) => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      // Helper to calculate item price with size modifier
      getItemPrice: (item) => {
        const basePrice = item.product.price;
        if (!item.selectedSize || !item.product.sizes) {
          return basePrice;
        }
        const sizeOption = item.product.sizes.find(s => s.value === item.selectedSize);
        return basePrice + (sizeOption?.priceModifier || 0);
      },

      addItem: (product, quantity, selectedSize, deliveryDate) => {
        set((state) => {
          // Generate unique ID for cart item (product + size + date combination)
          const itemId = `${product._id}-${selectedSize || 'default'}-${deliveryDate || 'no-date'}`;
          
          const existingItem = state.items.find(
            (item) => {
              const existingItemId = `${item.product._id}-${item.selectedSize || 'default'}-${item.deliveryDate || 'no-date'}`;
              return existingItemId === itemId;
            }
          );

          if (existingItem) {
            // If same product with same size and date exists, increase quantity
            return {
              items: state.items.map((item) => {
                const existingItemId = `${item.product._id}-${item.selectedSize || 'default'}-${item.deliveryDate || 'no-date'}`;
                return existingItemId === itemId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item;
              }),
            };
          }

          // Add new item to cart
          return {
            items: [...state.items, { product, quantity, selectedSize, deliveryDate }],
          };
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((_, index) => index.toString() !== itemId),
        }));
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }

        set((state) => ({
          items: state.items.map((item, index) =>
            index.toString() === itemId ? { ...item, quantity } : item
          ),
        }));
      },

      updateDeliveryDate: (itemId, date) => {
        set((state) => ({
          items: state.items.map((item, index) =>
            index.toString() === itemId ? { ...item, deliveryDate: date } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        const store = get();
        return store.items.reduce((total, item) => {
          const itemPrice = store.getItemPrice(item);
          return total + itemPrice * item.quantity;
        }, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);

