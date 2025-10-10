import { client } from './client';

// GROQ query fragments
const productFields = `
  _id,
  _createdAt,
  name,
  slug,
  description,
  price,
  minimumOrderQuantity,
  sizes,
  images,
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

const flavourFields = `
  _id,
  name,
  slug,
  description,
  image,
  ingredients,
  available,
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
export async function getFeaturedProducts(limit = 8) {
  const query = `*[_type == "product" && available == true && featured == true] | order(_createdAt desc)[0...${limit}] {
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

// Fetch all available flavours
export async function getFlavours() {
  const query = `*[_type == "flavour" && available == true] | order(order asc) {
    ${flavourFields}
  }`;
  return client.fetch(query);
}

// Fetch single flavour by slug
export async function getFlavourBySlug(slug: string) {
  const query = `*[_type == "flavour" && slug.current == $slug][0] {
    ${flavourFields}
  }`;
  return client.fetch(query, { slug });
}

