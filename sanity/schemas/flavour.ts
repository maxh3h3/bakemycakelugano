import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'flavour',
  title: 'Flavour',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Flavour Name',
      type: 'string',
      description: 'E.g., "Chocolate", "Vanilla", "Strawberry"',
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
      description: 'Describe this flavour (e.g., "Rich dark chocolate with hints of coffee")',
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
              name: 'name',
              title: 'Ingredient Name',
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
              name: 'name',
              isAllergen: 'isAllergen',
            },
            prepare({ name, isAllergen }) {
              return {
                title: name,
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
      title: 'name',
      subtitle: 'description',
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

