import { DocumentActionComponent } from 'sanity';
import { useRouter } from 'sanity/router';
import { useClient } from 'sanity';

// Simple UUID generator
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const DuplicateAction: DocumentActionComponent = (props) => {
  const router = useRouter();
  const client = useClient({ apiVersion: '2023-05-03' });

  return {
    label: 'Duplicate',
    icon: () => '📋',
    onHandle: async () => {
      const { draft, published } = props;
      
      // Get the current document (prefer draft if available, otherwise published)
      const doc: any = draft || published;
      
      if (!doc) {
        console.error('No document to duplicate');
        return;
      }

      // Generate new ID
      const newId = generateId();

      // Create a copy of the document
      const duplicatedDoc: any = {
        ...doc,
        _id: newId,
        _type: doc._type,
        // Add " (Copy)" to the names to make it clear it's a duplicate
        name_en: `${doc.name_en} (Copy)`,
        name_it: `${doc.name_it} (Copy)`,
        slug: {
          _type: 'slug',
          current: `${doc.slug?.current || 'product'}-copy-${Date.now()}`,
        },
      };

      // Remove system fields that shouldn't be copied
      delete duplicatedDoc._createdAt;
      delete duplicatedDoc._updatedAt;
      delete duplicatedDoc._rev;

      try {
        // Create the new document
        await client.create(duplicatedDoc);
        
        // Navigate to the new document
        router.navigateIntent('edit', { id: newId, type: doc._type });
        
        props.onComplete();
      } catch (error) {
        console.error('Error duplicating document:', error);
        alert('Failed to duplicate product. Please try again.');
      }
    },
  };
};

