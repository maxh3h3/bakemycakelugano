// BUSINESS CONTEXT: Decoration Mode PDF - Production Schedule for Decorating Staff
// Used by: Kitchen decorating staff
// 
// Shows: Order numbers, reference images, writing on cake, decoration notes
// Language: Russian (native text, no transliteration)

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Database } from '@/lib/supabase/types';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

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
    padding: 30,
    fontFamily: 'Roboto',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #EDD7B8', // cream-300
    paddingBottom: 15,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  brandingContainer: {
    flexDirection: 'column',
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    marginBottom: 2,
  },
  tagline: {
    fontSize: 11,
    color: '#533D29', // brown-700
    fontStyle: 'italic',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 5,
  },
  dateRange: {
    fontSize: 11,
    color: '#2C2C2C', // charcoal-900
    textAlign: 'center',
    marginBottom: 15,
  },
  orderCard: {
    marginBottom: 25,
    padding: 15,
    borderTop: '2 solid #8B6B47', // brown-500
    backgroundColor: '#FFFFFF',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: '1 solid #F5E6D3',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
  },
  deliveryDate: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  productName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    marginTop: 8,
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 11,
    color: '#2C2C2C',
    lineHeight: 1.5,
    paddingLeft: 10,
  },
  writingContent: {
    fontSize: 12,
    color: '#2C2C2C',
    fontStyle: 'italic',
    paddingLeft: 10,
    marginBottom: 4,
  },
  imagesContainer: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  referenceImage: {
    width: 150, // Large images
    height: 150,
    objectFit: 'cover',
    border: '2 solid #8B6B47',
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    backgroundColor: '#F5E6D3',
    border: '2 solid #8B6B47',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 9,
    color: '#808080',
    textAlign: 'center',
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

  // Group items by order number
  const itemsByOrder = items.reduce((acc, item) => {
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
      <Page size="A4" style={styles.page}>
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

        {/* Order Cards */}
        {sortedOrders.map(([orderNumber, orderItems]) => (
          <View key={orderNumber} wrap={false}>
            {orderItems.map((item) => (
              <View key={item.id} style={styles.orderCard}>
                {/* Order Header */}
                <View style={styles.orderHeader}>
                  <Text style={styles.orderNumber}>ЗАКАЗ: {orderNumber}</Text>
                  <Text style={styles.deliveryDate}>
                    ДОСТАВКА: {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('ru-RU') : 'Не указано'}
                  </Text>
                </View>

                {/* Product Name */}
                <Text style={styles.productName}>
                  Продукт: {item.product_name}
                </Text>

                {/* Writing on Cake */}
                {item.writing_on_cake && (
                  <View>
                    <Text style={styles.sectionLabel}>Надпись на торте:</Text>
                    <Text style={styles.writingContent}>
                      "{item.writing_on_cake}"
                    </Text>
                  </View>
                )}

                {/* Internal Decoration Notes */}
                {item.internal_decoration_notes && (
                  <View>
                    <Text style={styles.sectionLabel}>Внутренние заметки:</Text>
                    <Text style={styles.sectionContent}>
                      {item.internal_decoration_notes}
                    </Text>
                  </View>
                )}

                {/* Staff Notes */}
                {item.staff_notes && (
                  <View>
                    <Text style={styles.sectionLabel}>Заметки персонала:</Text>
                    <Text style={styles.sectionContent}>
                      {item.staff_notes}
                    </Text>
                  </View>
                )}

                {/* Reference Images */}
                {item.product_image_urls && Array.isArray(item.product_image_urls) && item.product_image_urls.length > 0 && (
                  <View>
                    <Text style={styles.sectionLabel}>РЕФЕРЕНСНЫЕ ИЗОБРАЖЕНИЯ:</Text>
                    <View style={styles.imagesContainer}>
                      {item.product_image_urls.slice(0, 3).map((url, idx) => (
                        <Image
                          key={idx}
                          src={url}
                          style={styles.referenceImage}
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* No images placeholder */}
                {(!item.product_image_urls || !Array.isArray(item.product_image_urls) || item.product_image_urls.length === 0) && (
                  <View>
                    <Text style={styles.sectionLabel}>РЕФЕРЕНСНЫЕ ИЗОБРАЖЕНИЯ:</Text>
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.placeholderText}>
                        Изображения не загружены
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Создано: {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
