// BUSINESS CONTEXT: Cooking Mode PDF - Production Schedule for Baking Staff
// Used by: Kitchen baking staff
// 
// Shows: Order numbers, product names, sizes, weights for baking
// Language: Russian (native text, no transliteration)

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { Database } from '@/lib/supabase/types';

type OrderItem = Database['public']['Tables']['order_items']['Row'];

interface CookingModePDFProps {
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

// Create styles - similar to CSS with flexbox
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
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B6B47', // brown-500
    padding: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #F5E6D3', // cream-200
    padding: 8,
    minHeight: 35,
  },
  tableRowAlt: {
    backgroundColor: '#F9F6F1', // cream-100
  },
  colOrderNum: {
    width: '15%',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B6B47',
  },
  colProduct: {
    width: '30%',
    fontSize: 11,
  },
  colQty: {
    width: '10%',
    fontSize: 11,
    textAlign: 'center',
  },
  colSize: {
    width: '15%',
    fontSize: 11,
    textAlign: 'center',
  },
  colWeight: {
    width: '15%',
    fontSize: 11,
    textAlign: 'center',
  },
  colDelivery: {
    width: '15%',
    fontSize: 11,
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

export default function CookingModePDF({ items, dateRange }: CookingModePDFProps) {
  const generatedAt = new Date().toLocaleString('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
          <Text style={styles.title}>ГРАФИК ПРОИЗВОДСТВА - ВЫПЕЧКА</Text>
          <Text style={styles.dateRange}>Период: {dateRange}</Text>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={styles.colOrderNum}>Заказ №</Text>
            <Text style={styles.colProduct}>Продукт</Text>
            <Text style={styles.colQty}>Кол-во</Text>
            <Text style={styles.colSize}>Размер</Text>
            <Text style={styles.colWeight}>Вес</Text>
            <Text style={styles.colDelivery}>Доставка</Text>
          </View>

          {/* Table Rows */}
          {items.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.tableRow,
                index % 2 === 1 && styles.tableRowAlt,
              ]}
            >
              <Text style={styles.colOrderNum}>
                {item.order_number || 'N/A'}
              </Text>
              <Text style={styles.colProduct}>
                {item.product_name}
              </Text>
              <Text style={styles.colQty}>
                {item.quantity}
              </Text>
              <Text style={styles.colSize}>
                {item.diameter_cm ? `${item.diameter_cm} см` : '—'}
              </Text>
              <Text style={styles.colWeight}>
                {item.weight_kg ? `${item.weight_kg}` : '—'}
              </Text>
              <Text style={styles.colDelivery}>
                {item.delivery_date ? new Date(item.delivery_date).toLocaleDateString('ru-RU') : '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Создано: {generatedAt} | Страница 1 из 1
        </Text>
      </Page>
    </Document>
  );
}
