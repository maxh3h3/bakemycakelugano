import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';
import { DuplicateAction } from './lib/documentActions';
import { structure } from './lib/structure';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;

if (!projectId || !dataset) {
  throw new Error('Missing Sanity project ID or dataset');
}

export default defineConfig({
  name: 'default',
  title: 'Bake My Cake',

  projectId,
  dataset,

  basePath: '/studio',

  plugins: [
    structureTool({
      structure, // Use our custom structure
    }),
    visionTool()
  ],

  schema: {
    types: schemaTypes,
  },

  document: {
    actions: (prev, context) => {
      // Add duplicate action only for product documents
      if (context.schemaType === 'product') {
        return [...prev, DuplicateAction];
      }
      return prev;
    },
  },

  // Enable real-time updates
  unstable_enableServerActions: true,
});

