// BUSINESS CONTEXT: Decoration Mode PDF - Production Schedule for Decorating Staff
// Used by: Kitchen decorating staff
// 
// Shows: Order numbers, reference images, writing on cake, decoration notes
// Language: Russian (native text, no transliteration)

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Database } from '@/lib/supabase/types';

type OrderItem = Database['public']['Tables']['order_items']['Row'] & {
  delivery_time?: string | null; // Extended type for denormalized field (migration pending)
};

interface DecorationModePDFProps {
  items: OrderItem[];
  dateRange: string;
}

// Register fonts that support Cyrillic characters
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 300,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf',
      fontWeight: 400,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-italic-webfont.ttf',
      fontWeight: 400,
      fontStyle: 'italic',
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf',
      fontWeight: 500,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 700,
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bolditalic-webfont.ttf',
      fontWeight: 700,
      fontStyle: 'italic',
    },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: '#FDFCFB', // cream-50
    padding: 16,
    fontFamily: 'Roboto',
    orientation: 'portrait',
  },
  header: {
    marginBottom: 12,
    borderBottom: '2 solid #EDD7B8', // cream-300
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  brandingContainer: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    marginBottom: 2,
  },
  tagline: {
    fontSize: 9,
    color: '#533D29', // brown-700
    fontStyle: 'italic',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 3,
  },
  dateRange: {
    fontSize: 9,
    color: '#2C2C2C', // charcoal-900
    textAlign: 'center',
    marginBottom: 8,
  },
  // Card-based layout for portrait
  itemsContainer: {
    marginTop: 8,
  },
  itemCard: {
    marginBottom: 10,
    borderRadius: 6,
    border: '1.5 solid #EDD7B8',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  itemCardAlt: {
    backgroundColor: '#F9F6F1', // cream-100
  },
  cardHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B6B47',
    padding: 7,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardOrderNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardProduct: {
    fontSize: 11,
    color: '#F5E6D3',
  },
  cardDeliveryTime: {
    fontSize: 10,
    color: '#F5E6D3',
  },
  cardBody: {
    padding: 10,
    flexDirection: 'row',
    gap: 10,
  },
  contentLeft: {
    flex: 1,
    paddingRight: 8,
  },
  notesSection: {
    marginBottom: 0,
  },
  notesLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#8B6B47',
    marginBottom: 2,
  },
  writingText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#2C2C2C',
    marginBottom: 5,
    backgroundColor: '#FFF9E6',
    padding: 5,
    borderRadius: 3,
  },
  cellNotes: {
    fontSize: 9,
    color: '#2C2C2C',
    lineHeight: 1.3,
    marginBottom: 5,
  },
  contentRight: {
    width: 170,
    flexShrink: 0,
  },
  imagesSection: {
    borderLeft: '1 solid #F5E6D3',
    paddingLeft: 10,
  },
  imagesSectionLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#8B6B47',
    marginBottom: 6,
    textAlign: 'center',
  },
  imagesContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  tableImage: {
    width: 150,
    height: 150,
    objectFit: 'cover',
    border: '1.5 solid #8B6B47',
    borderRadius: 3,
  },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    textAlign: 'center',
    fontSize: 7,
    color: '#808080',
  },
});

export default function DecorationModePDF({ items, dateRange }: DecorationModePDFProps) {
  const generatedAt = new Date().toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Filter items to only include those with images or notes
  const filteredItems = items.filter(item => {
    const hasImages = item.product_image_urls && Array.isArray(item.product_image_urls) && item.product_image_urls.length > 0;
    const hasWriting = !!item.writing_on_cake;
    const hasInternalNotes = !!item.internal_decoration_notes;
    const hasStaffNotes = !!item.staff_notes;
    
    return hasImages || hasWriting || hasInternalNotes || hasStaffNotes;
  });

  // Group filtered items by order number
  const itemsByOrder = filteredItems.reduce((acc, item) => {
    const orderNum = item.order_number || 'N/A';
    if (!acc[orderNum]) {
      acc[orderNum] = [];
    }
    acc[orderNum].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  // Sort by delivery date
  const sortedOrders = Object.entries(itemsByOrder).sort((a, b) => {
    const dateA = a[1][0]?.delivery_date || '';
    const dateB = b[1][0]?.delivery_date || '';
    return dateA.localeCompare(dateB);
  });

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              src="/images/icons/logo_white_back.png"
              style={styles.logo}
            />
            <View style={styles.brandingContainer}>
              <Text style={styles.companyName}>Bake My Cake</Text>
              <Text style={styles.tagline}>Pasticceria Artigianale</Text>
            </View>
          </View>
          <Text style={styles.title}>ГРАФИК ПРОИЗВОДСТВА - ДЕКОР</Text>
          <Text style={styles.dateRange}>Период: {dateRange}</Text>
        </View>

        {/* Items as Cards */}
        <View style={styles.itemsContainer}>
          {sortedOrders.map(([orderNumber, orderItems], orderIdx) => (
            <View key={orderNumber}>
              {orderItems.map((item, itemIdx) => {
                const hasNotes = item.writing_on_cake || item.internal_decoration_notes || item.staff_notes;
                const hasImages = item.product_image_urls && Array.isArray(item.product_image_urls) && item.product_image_urls.length > 0;
                
                return (
                  <View
                    key={item.id}
                    wrap={false}
                    style={[
                      styles.itemCard,
                      (orderIdx + itemIdx) % 2 === 1 ? styles.itemCardAlt : {},
                    ]}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardHeaderLeft}>
                        <Text style={styles.cardOrderNum}>№ {orderNumber}</Text>
                        <Text style={styles.cardProduct}>{item.product_name}</Text>
                      </View>
                      {item.delivery_time && (
                        <Text style={styles.cardDeliveryTime}>{item.delivery_time}</Text>
                      )}
                    </View>

                    {/* Card Body - Two Column Layout */}
                    <View style={styles.cardBody}>
                      {/* Left Column: Text Content */}
                      <View style={styles.contentLeft}>
                        {hasNotes && (
                          <View style={styles.notesSection}>
                            {item.writing_on_cake && (
                              <View style={{ marginBottom: 5 }}>
                                <Text style={styles.notesLabel}>Надпись на торте:</Text>
                                <Text style={styles.writingText}>"{item.writing_on_cake}"</Text>
                              </View>
                            )}
                            {item.internal_decoration_notes && (
                              <View style={{ marginBottom: 5 }}>
                                <Text style={styles.notesLabel}>Внутренние заметки:</Text>
                                <Text style={styles.cellNotes}>{item.internal_decoration_notes}</Text>
                              </View>
                            )}
                            {item.staff_notes && (
                              <View style={{ marginBottom: 5 }}>
                                <Text style={styles.notesLabel}>Заметки персонала:</Text>
                                <Text style={styles.cellNotes}>{item.staff_notes}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Right Column: Images */}
                      {hasImages && (
                        <View style={styles.contentRight}>
                          <View style={styles.imagesSection}>
                            <Text style={styles.imagesSectionLabel}>РЕФЕРЕНС</Text>
                            <View style={styles.imagesContainer}>
                              {item.product_image_urls?.slice(0, 4).map((url, idx) => (
                                <Image
                                  key={idx}
                                  src={url}
                                  style={styles.tableImage}
                                />
                              ))}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Создано: {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
