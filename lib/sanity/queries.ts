import { client } from './client';

// GROQ query fragments
const productFields = `
  _id,
  _createdAt,
  name,
  slug,
  description,
  price,
  image,
  category->,
  available,
  featured,
  ingredients,
  allergens
`;

const categoryFields = `
  _id,
  name,
  slug,
  description,
  image,
  order
`;

// Fetch all categories
export async function getCategories() {
  const query = `*[_type == "category"] | order(order asc) {
    ${categoryFields}
  }`;
  return client.fetch(query);
}

// Fetch all available products
export async function getProducts() {
  const query = `*[_type == "product" && available == true] | order(_createdAt desc) {
    ${productFields}
  }`;
  return client.fetch(query);
}

// Fetch featured products
export async function getFeaturedProducts() {
  const query = `*[_type == "product" && available == true && featured == true] | order(_createdAt desc) {
    ${productFields}
  }`;
  return client.fetch(query);
}

// Fetch products by category
export async function getProductsByCategory(categorySlug: string) {
  const query = `*[_type == "product" && available == true && category->slug.current == $categorySlug] | order(_createdAt desc) {
    ${productFields}
  }`;
  return client.fetch(query, { categorySlug });
}

// Fetch single product by slug
export async function getProductBySlug(slug: string) {
  const query = `*[_type == "product" && slug.current == $slug][0] {
    ${productFields}
  }`;
  return client.fetch(query, { slug });
}

// Fetch single category by slug
export async function getCategoryBySlug(slug: string) {
  const query = `*[_type == "category" && slug.current == $slug][0] {
    ${categoryFields}
  }`;
  return client.fetch(query, { slug });
}

