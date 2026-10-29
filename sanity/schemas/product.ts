import { defineType, defineField } from 'sanity';
import { PIECES, TIERS, WEIGHTS_KG, sizeValue, type SizeChoice } from '../lib/sizeValue';

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'name_en',
      title: 'Product Name (English)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name_it',
      title: 'Product Name (Italian)',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'name_en',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_en',
      title: 'Description (English)',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description_it',
      title: 'Description (Italian)',
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
      // The website and checkout pick a size by its value, so two sizes with the same value collapse into the first one
      validation: (Rule) =>
        Rule.custom((sizes?: SizeChoice[]) => {
          const values = (sizes || []).map(sizeValue);
          const dupes = values.filter((v, i) => v && values.indexOf(v) !== i);
          return dupes.length ? `Two sizes are both "${dupes[0]}"` : true;
        }),
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'unit',
              title: 'Sold by',
              type: 'string',
              options: {
                list: [
                  { title: 'Weight (cakes)', value: 'kg' },
                  { title: 'Pieces (cupcakes, cookies…)', value: 'pcs' },
                ],
                layout: 'radio',
                direction: 'horizontal',
              },
              initialValue: 'kg',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'weight',
              title: 'Weight',
              type: 'number',
              options: { list: WEIGHTS_KG.map((kg) => ({ title: `${kg} kg`, value: kg })) },
              hidden: ({ parent }) => parent?.unit !== 'kg',
              validation: (Rule) =>
                Rule.custom((weight, { parent }) =>
                  (parent as SizeChoice)?.unit === 'kg' && weight == null ? 'Pick a weight' : true
                ),
            },
            {
              name: 'tiers',
              title: 'Tiers',
              type: 'number',
              options: { list: TIERS.map((n) => ({ title: n === 1 ? 'Single tier' : `${n} tiers`, value: n })), layout: 'radio', direction: 'horizontal' },
              initialValue: 1,
              hidden: ({ parent }) => parent?.unit !== 'kg',
            },
            {
              name: 'pieces',
              title: 'Pieces',
              type: 'number',
              options: { list: PIECES.map((n) => ({ title: `${n} pcs`, value: n })) },
              hidden: ({ parent }) => parent?.unit !== 'pcs',
              validation: (Rule) =>
                Rule.custom((pieces, { parent }) =>
                  (parent as SizeChoice)?.unit === 'pcs' && pieces == null ? 'Pick the number of pieces' : true
                ),
            },
            {
              name: 'label_en',
              title: 'Size Label (English)',
              type: 'string',
              description: 'What customer sees (e.g., "1 kg for 5-8 persons")',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'label_it',
              title: 'Size Label (Italian)',
              type: 'string',
              description: 'What customer sees (e.g., "1 kg per 5-8 persone")',
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
              label_en: 'label_en',
              priceModifier: 'priceModifier',
              unit: 'unit',
              weight: 'weight',
              pieces: 'pieces',
              tiers: 'tiers',
            },
            prepare({ label_en, priceModifier, ...choice }) {
              return {
                title: `${sizeValue(choice) ?? '⚠️ no size picked'} · ${label_en ?? ''}`,
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
      name: 'availableFlavours',
      title: 'Available Flavours',
      type: 'array',
      of: [
        {
          type: 'reference',
          to: [{ type: 'flavour' }],
        },
      ],
      description: 'Select which flavours are available for this product (optional, leave empty if not applicable)',
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
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Control the display order (lower numbers appear first). Leave empty to sort by creation date.',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'ingredients',
      title: 'Ingredients',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'name_en',
              title: 'Ingredient Name (English)',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'name_it',
              title: 'Ingredient Name (Italian)',
              type: 'string',
              validation: (Rule) => Rule.required(),
            },
            {
              name: 'isAllergen',
              title: 'Is Allergen?',
              type: 'boolean',
              description: 'Check if this ingredient is a common allergen',
              initialValue: false,
            },
          ],
          preview: {
            select: {
              name_en: 'name_en',
              name_it: 'name_it',
              isAllergen: 'isAllergen',
            },
            prepare({ name_en, name_it, isAllergen }) {
              return {
                title: `${name_en} / ${name_it}`,
                subtitle: isAllergen ? '⚠️ Allergen' : 'Regular ingredient',
              };
            },
          },
        },
      ],
      description: 'List of ingredients with allergen flags (optional - can be defined in flavours instead)',
    }),
  ],
  preview: {
    select: {
      title: 'name_en',
      subtitle: 'category.name_en',
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

