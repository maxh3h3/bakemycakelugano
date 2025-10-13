import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'flavour',
  title: 'Flavour',
  type: 'document',
  fields: [
    defineField({
      name: 'name_en',
      title: 'Flavour Name (English)',
      type: 'string',
      description: 'E.g., "Chocolate", "Vanilla", "Strawberry"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name_it',
      title: 'Flavour Name (Italian)',
      type: 'string',
      description: 'E.g., "Cioccolato", "Vaniglia", "Fragola"',
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
      description: 'Describe this flavour (e.g., "Rich dark chocolate with hints of coffee")',
    }),
    defineField({
      name: 'description_it',
      title: 'Description (Italian)',
      type: 'text',
      rows: 4,
      description: 'Describe this flavour in Italian',
    }),
    defineField({
      name: 'image',
      title: 'Flavour Image',
      type: 'image',
      description: 'Photo representing this flavour',
      options: {
        hotspot: true,
      },
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
      description: 'List of ingredients with allergen flags',
    }),
    defineField({
      name: 'available',
      title: 'Available',
      type: 'boolean',
      description: 'Is this flavour currently available?',
      initialValue: true,
    }),
    defineField({
      name: 'order',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first in flavour selection',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'name_en',
      subtitle: 'description_en',
      media: 'image',
      available: 'available',
    },
    prepare({ title, subtitle, media, available }) {
      return {
        title: `${title} ${!available ? '(Unavailable)' : ''}`,
        subtitle: subtitle || 'No description',
        media,
      };
    },
  },
});

