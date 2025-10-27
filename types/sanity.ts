import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export interface Category {
  _id: string;
  name: string; // Localized based on query locale
  name_en: string;
  name_it: string;
  slug: {
    current: string;
  };
  description?: string; // Localized based on query locale
  description_en?: string;
  description_it?: string;
  image?: SanityImageSource;
  order: number;
}

export interface ProductSize {
  label: string; // Localized based on query locale
  label_en: string;
  label_it: string;
  value: string;
  priceModifier: number;
}

export interface Ingredient {
  name: string; // Localized based on query locale
  name_en: string;
  name_it: string;
  isAllergen: boolean;
}

export interface Flavour {
  _id: string;
  name: string; // Localized based on query locale
}

export interface Product {
  _id: string;
  _createdAt: string;
  name: string; // Localized based on query locale
  name_en: string;
  name_it: string;
  slug: {
    current: string;
  };
  description: string; // Localized based on query locale
  description_en: string;
  description_it: string;
  price: number;
  minimumOrderQuantity: number;
  sizes?: ProductSize[];
  images: SanityImageSource[];
  category: Category;
  availableFlavours?: Flavour[];
  available: boolean;
  featured: boolean;
  order?: number; // Display order (lower numbers appear first)
  ingredients?: Ingredient[];
}

