import { client } from './client';

type Locale = 'en' | 'it';

// Helper function to create locale-aware projections
function getLocalizedFields(locale: Locale = 'en') {
  const nameSuffix = `_${locale}`;
  
  return {
    product: `
      _id,
      _createdAt,
      "name": name${nameSuffix},
      name_en,
      name_it,
      slug,
      "description": description${nameSuffix},
      description_en,
      description_it,
      price,
      minimumOrderQuantity,
      "sizes": sizes[]{
        "label": label${nameSuffix},
        label_en,
        label_it,
        value,
        priceModifier
      },
      images,
      category->,
      "availableFlavours": availableFlavours[]->{
        _id,
        "name": name${nameSuffix}
      },
      available,
      featured,
      "ingredients": ingredients[]{
        "name": name${nameSuffix},
        name_en,
        name_it,
        isAllergen
      },
      allergens
    `,
    category: `
      _id,
      "name": name${nameSuffix},
      name_en,
      name_it,
      slug,
      "description": description${nameSuffix},
      description_en,
      description_it,
      image,
      order
    `,
    flavour: `
      _id,
      "name": name${nameSuffix},
      name_en,
      name_it,
      slug,
      "description": description${nameSuffix},
      description_en,
      description_it,
      image,
      "ingredients": ingredients[]{
        "name": name${nameSuffix},
        name_en,
        name_it,
        isAllergen
      },
      available,
      order
    `
  };
}

// Fetch all categories
export async function getCategories(locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "category"] | order(order asc) {
    ${fields.category}
  }`;
  return client.fetch(query);
}

// Fetch all available products
export async function getProducts(locale: Locale = 'en') {
  try {
    const fields = getLocalizedFields(locale);
    const query = `*[_type == "product" && available == true] | order(_createdAt desc) {
      ${fields.product}
    }`;
    return await client.fetch(query);
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    // Return empty array to prevent build failures
    return [];
  }
}

// Fetch featured products
export async function getFeaturedProducts(limit = 8, locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "product" && available == true && featured == true] | order(_createdAt desc)[0...${limit}] {
    ${fields.product}
  }`;
  return client.fetch(query);
}

// Fetch products by category
export async function getProductsByCategory(categorySlug: string, locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "product" && available == true && category->slug.current == $categorySlug] | order(_createdAt desc) {
    ${fields.product}
  }`;
  return client.fetch(query, { categorySlug });
}

// Fetch single product by slug
export async function getProductBySlug(slug: string, locale: Locale = 'en') {
  try {
    const fields = getLocalizedFields(locale);
    const query = `*[_type == "product" && slug.current == $slug][0] {
      ${fields.product}
    }`;
    const result = await client.fetch(query, { slug });
    
    if (!result) {
      console.warn(`⚠️ Product not found for slug: ${slug}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error fetching product by slug:', error);
    throw error;
  }
}

// Fetch single category by slug
export async function getCategoryBySlug(slug: string, locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "category" && slug.current == $slug][0] {
    ${fields.category}
  }`;
  return client.fetch(query, { slug });
}

// Fetch all available flavours
export async function getFlavours(locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "flavour" && available == true] | order(order asc) {
    ${fields.flavour}
  }`;
  return client.fetch(query);
}

// Fetch single flavour by slug
export async function getFlavourBySlug(slug: string, locale: Locale = 'en') {
  const fields = getLocalizedFields(locale);
  const query = `*[_type == "flavour" && slug.current == $slug][0] {
    ${fields.flavour}
  }`;
  return client.fetch(query, { slug });
}

