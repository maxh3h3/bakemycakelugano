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
    padding: 20,
    fontFamily: 'Roboto',
    orientation: 'landscape',
  },
  header: {
    marginBottom: 15,
    borderBottom: '2 solid #EDD7B8', // cream-300
    paddingBottom: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  brandingContainer: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    marginBottom: 2,
  },
  tagline: {
    fontSize: 10,
    color: '#533D29', // brown-700
    fontStyle: 'italic',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  dateRange: {
    fontSize: 10,
    color: '#2C2C2C', // charcoal-900
    textAlign: 'center',
    marginBottom: 10,
  },
  // Table styles
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B6B47', // brown-500
    padding: 10,
    borderBottom: '2 solid #533D29',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #F5E6D3',
    minHeight: 170,
  },
  tableRowAlt: {
    backgroundColor: '#F9F6F1', // cream-100
  },
  // Column styles (widths)
  colOrderNum: {
    width: '12%',
    padding: 10,
  },
  colProduct: {
    width: '15%',
    padding: 10,
  },
  colDelivery: {
    width: '12%',
    padding: 10,
  },
  colNotes: {
    width: '28%',
    padding: 10,
  },
  colImages: {
    width: '33%',
    padding: 10,
  },
  // Header text
  headerText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Cell text
  cellOrderNum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B6B47',
  },
  cellProduct: {
    fontSize: 13,
    color: '#2C2C2C',
  },
  cellDelivery: {
    fontSize: 12,
    color: '#2C2C2C',
  },
  cellNotes: {
    fontSize: 11,
    color: '#2C2C2C',
    lineHeight: 1.4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B6B47',
    marginTop: 4,
    marginBottom: 2,
  },
  writingText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  // Images in table
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tableImage: {
    width: 150,
    height: 150,
    objectFit: 'cover',
    border: '2 solid #8B6B47',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
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
      <Page size="A4" orientation="landscape" style={styles.page}>
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

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <View style={styles.colOrderNum}>
              <Text style={styles.headerText}>Заказ №</Text>
            </View>
            <View style={styles.colProduct}>
              <Text style={styles.headerText}>Продукт</Text>
            </View>
            <View style={styles.colDelivery}>
              <Text style={styles.headerText}>Время</Text>
            </View>
            <View style={styles.colNotes}>
              <Text style={styles.headerText}>Надписи и Заметки</Text>
            </View>
            <View style={styles.colImages}>
              <Text style={styles.headerText}>Референсные Изображения</Text>
            </View>
          </View>

          {/* Table Rows */}
          {sortedOrders.map(([orderNumber, orderItems], orderIdx) => (
            <View key={orderNumber}>
              {orderItems.map((item, itemIdx) => (
                <View
                  key={item.id}
                  wrap={false}
                  style={[
                    styles.tableRow,
                    (orderIdx + itemIdx) % 2 === 1 ? styles.tableRowAlt : {},
                  ]}
                >
                  {/* Order Number Column */}
                  <View style={styles.colOrderNum}>
                    <Text style={styles.cellOrderNum}>{orderNumber}</Text>
                  </View>

                  {/* Product Column */}
                  <View style={styles.colProduct}>
                    <Text style={styles.cellProduct}>{item.product_name}</Text>
                  </View>

                  {/* Delivery Time Column */}
                  <View style={styles.colDelivery}>
                    <Text style={styles.cellDelivery}>
                      {item.delivery_time || '—'}
                    </Text>
                  </View>

                  {/* Notes Column */}
                  <View style={styles.colNotes}>
                    {item.writing_on_cake && (
                      <View>
                        <Text style={styles.notesLabel}>Надпись:</Text>
                        <Text style={styles.writingText}>"{item.writing_on_cake}"</Text>
                      </View>
                    )}
                    {item.internal_decoration_notes && (
                      <View>
                        <Text style={styles.notesLabel}>Внутренние:</Text>
                        <Text style={styles.cellNotes}>{item.internal_decoration_notes}</Text>
                      </View>
                    )}
                    {item.staff_notes && (
                      <View>
                        <Text style={styles.notesLabel}>Персонал:</Text>
                        <Text style={styles.cellNotes}>{item.staff_notes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Images Column */}
                  <View style={styles.colImages}>
                    {item.product_image_urls && Array.isArray(item.product_image_urls) && item.product_image_urls.length > 0 ? (
                      <View style={styles.imagesContainer}>
                        {item.product_image_urls.slice(0, 4).map((url, idx) => (
                          <Image
                            key={idx}
                            src={url}
                            style={styles.tableImage}
                          />
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.cellNotes}>—</Text>
                    )}
                  </View>
                </View>
              ))}
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
