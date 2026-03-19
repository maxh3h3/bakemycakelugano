import { NextRequest, NextResponse } from 'next/server';
import { getProductsGroupedByCategory, getFlavours } from '@/lib/sanity/queries';
import { urlFor } from '@/lib/sanity/image-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get('locale') === 'en' ? 'en' : 'it') as 'en' | 'it';

  try {
    const [grouped, flavours] = await Promise.all([
      getProductsGroupedByCategory(locale),
      getFlavours(locale),
    ]);

    // Flatten products with resolved image URLs and clean structure for the bot
    const products = grouped.flatMap((category: any) =>
      (category.products ?? []).map((product: any) => ({
        id: product._id,
        slug: product.slug?.current ?? '',
        name: product.name ?? product.name_en,
        name_en: product.name_en,
        name_it: product.name_it,
        description: product.description ?? product.description_en,
        category: category.name,
        price: product.price,
        minimumOrderQuantity: product.minimumOrderQuantity ?? 1,
        sizes: (product.sizes ?? []).map((s: any) => ({
          label: s.label ?? s.label_en,
          value: s.value,
          totalPrice: product.price + (s.priceModifier ?? 0),
        })),
        availableFlavours: (product.availableFlavours ?? []).map((f: any) => f.name),
        allergens: (product.ingredients ?? [])
          .filter((i: any) => i.isAllergen)
          .map((i: any) => i.name),
        imageUrl: product.images?.[0]
          ? urlFor(product.images[0]).width(600).height(600).fit('crop').url()
          : null,
      }))
    );

    const flavourList = flavours.map((f: any) => ({
      name: f.name,
      slug: f.slug?.current ?? '',
      description: f.description,
    }));

    return NextResponse.json({ products, flavours: flavourList });
  } catch (error) {
    console.error('Bot products API error:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}
