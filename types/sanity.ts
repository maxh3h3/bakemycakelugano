import type { SanityImageSource } from '@sanity/image-url/lib/types/types';

export interface Category {
  _id: string;
  name: string;
  slug: {
    current: string;
  };
  description?: string;
  image?: SanityImageSource;
  order: number;
}

export interface Product {
  _id: string;
  _createdAt: string;
  name: string;
  slug: {
    current: string;
  };
  description: string;
  price: number;
  image: SanityImageSource;
  category: Category;
  available: boolean;
  featured: boolean;
  ingredients?: string[];
  allergens?: string[];
}

