import { StructureBuilder } from 'sanity/structure';
import { TagIcon, SparklesIcon, FolderIcon, BasketIcon, ComponentIcon } from '@sanity/icons';

/**
 * Custom Sanity Studio Structure
 * This defines how documents are organized in the admin interface
 */
export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Categories section
      S.listItem()
        .title('Categories')
        .icon(FolderIcon)
        .child(
          S.documentTypeList('category')
            .title('All Categories')
            .filter('_type == "category"')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
        ),

      // Divider
      S.divider(),

      // Products grouped by category
      S.listItem()
        .title('Products by Category')
        .icon(ComponentIcon)
        .child(
          // First, fetch all categories and create a list item for each
          S.documentTypeList('category')
            .title('Select a Category')
            .filter('_type == "category"')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
            .child((categoryId) =>
              // For each category, show products that belong to it
              S.documentList()
                .title('Products')
                .filter('_type == "product" && category._ref == $categoryId')
                .params({ categoryId })
                .defaultOrdering([
                  { field: 'order', direction: 'asc' },
                  { field: '_createdAt', direction: 'desc' }
                ])
            )
        ),

      // All Products (flat list, like before)
      S.listItem()
        .title('All Products')
        .icon(BasketIcon)
        .child(
          S.documentTypeList('product')
            .title('All Products')
            .filter('_type == "product"')
            .defaultOrdering([
              { field: 'order', direction: 'asc' },
              { field: '_createdAt', direction: 'desc' }
            ])
        ),

      // Divider
      S.divider(),

      // Flavours section
      S.listItem()
        .title('Flavours')
        .icon(SparklesIcon)
        .child(
          S.documentTypeList('flavour')
            .title('All Flavours')
            .filter('_type == "flavour"')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
        ),

      // Divider
      S.divider(),

      // Quick filters for products
      S.listItem()
        .title('Product Filters')
        .icon(TagIcon)
        .child(
          S.list()
            .title('Filter Products')
            .items([
              // Available products
              S.listItem()
                .title('Available Products')
                .icon(BasketIcon)
                .child(
                  S.documentList()
                    .title('Available Products')
                    .filter('_type == "product" && available == true')
                    .defaultOrdering([
                      { field: 'order', direction: 'asc' },
                      { field: '_createdAt', direction: 'desc' }
                    ])
                ),

              // Unavailable products
              S.listItem()
                .title('Unavailable Products')
                .icon(BasketIcon)
                .child(
                  S.documentList()
                    .title('Unavailable Products')
                    .filter('_type == "product" && available == false')
                    .defaultOrdering([
                      { field: 'order', direction: 'asc' },
                      { field: '_createdAt', direction: 'desc' }
                    ])
                ),

              // Featured products
              S.listItem()
                .title('Featured Products')
                .icon(SparklesIcon)
                .child(
                  S.documentList()
                    .title('Featured Products')
                    .filter('_type == "product" && featured == true')
                    .defaultOrdering([
                      { field: 'order', direction: 'asc' },
                      { field: '_createdAt', direction: 'desc' }
                    ])
                ),

              // Products without category
              S.listItem()
                .title('Products Without Category')
                .icon(TagIcon)
                .child(
                  S.documentList()
                    .title('Products Without Category')
                    .filter('_type == "product" && !defined(category)')
                    .defaultOrdering([{ field: '_createdAt', direction: 'desc' }])
                ),
            ])
        ),

      // Divider
      S.divider(),

      // Settings or other document types can be added here
      // For example, if you add a settings singleton later
    ]);

