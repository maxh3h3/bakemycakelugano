import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'price',
      title: 'Price',
      type: 'number',
      validation: (Rule) => Rule.required().min(0).precision(2),
    }),
    defineField({
      name: 'minimumOrderQuantity',
      title: 'Minimum Order Quantity (MOQ)',
      type: 'number',
      description: 'Minimum number of items that must be ordered. Set to 1 for individual items.',
      initialValue: 1,
      validation: (Rule) => Rule.required().min(1).integer(),
    }),
    defineField({
      name: 'sizes',
      title: 'Size Options',
      type: 'array',
      description: 'Available sizes for this product (e.g., for cakes). Leave empty if product has no size variations.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Size Label',
              type: 'string',
              description: 'What customer sees (e.g., "1 kg for 5-8 persons")',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'value',
              title: 'Size Value',
              type: 'string',
              description: 'Internal identifier (e.g., "1kg", "2kg")',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'priceModifier',
              title: 'Price Adjustment (CHF)',
              type: 'number',
              description: 'Amount to add to base price. Use 0 for base size, positive numbers for larger sizes.',
              initialValue: 0,
              validation: (Rule) => Rule.required().min(0),
            },
          ],
          preview: {
            select: {
              label: 'label',
              priceModifier: 'priceModifier',
            },
            prepare({ label, priceModifier }) {
              return {
                title: label,
                subtitle: priceModifier > 0 ? `+${priceModifier} CHF` : 'Base price',
              };
            },
          },
        },
      ],
    }),
    defineField({
      name: 'images',
      title: 'Product Images',
      type: 'array',
      of: [
        {
          type: 'image',
          options: {
            hotspot: true,
          },
        },
      ],
      description: 'Upload multiple images. First image will be the main display image.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'category' }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'available',
      title: 'Available for Purchase',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'featured',
      title: 'Featured Product',
      type: 'boolean',
      description: 'Show this product on the homepage',
      initialValue: false,
    }),
    defineField({
      name: 'ingredients',
      title: 'Ingredients',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'List of main ingredients',
    }),
    defineField({
      name: 'allergens',
      title: 'Allergens',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Common allergens (e.g., nuts, dairy, eggs)',
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'category.name',
      images: 'images',
      available: 'available',
    },
    prepare({ title, subtitle, images, available }) {
      return {
        title: `${title} ${!available ? '(Unavailable)' : ''}`,
        subtitle: subtitle || 'No category',
        media: images?.[0], // Use first image as preview
      };
    },
  },
});

