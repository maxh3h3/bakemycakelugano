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
    padding: 20,
    fontFamily: 'Roboto',
    orientation: 'portrait',
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
    marginBottom: 12,
  },
  // Day section styles
  daySection: {
    marginTop: 12,
    marginBottom: 12,
  },
  dayHeader: {
    backgroundColor: '#8B6B47', // brown-500
    padding: 10,
    marginBottom: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 11,
    color: '#F5E6D3', // cream-200
  },
  dayCount: {
    fontSize: 11,
    color: '#F5E6D3', // cream-200
    fontWeight: 'bold',
  },
  // Table styles
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#C9A871', // brown-400 (lighter for sub-header)
    padding: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 11,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #F5E6D3', // cream-200
    padding: 6,
    minHeight: 30,
  },
  tableRowAlt: {
    backgroundColor: '#F9F6F1', // cream-100
  },
  colOrderNum: {
    width: '12%',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B6B47',
  },
  colProduct: {
    width: '28%',
    fontSize: 10,
  },
  colQty: {
    width: '8%',
    fontSize: 10,
    textAlign: 'center',
  },
  colSize: {
    width: '14%',
    fontSize: 10,
    textAlign: 'center',
  },
  colWeight: {
    width: '18%',
    fontSize: 10,
    textAlign: 'center',
  },
  colFlavor: {
    width: '20%',
    fontSize: 10,
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
  emptyDay: {
    textAlign: 'center',
    fontSize: 11,
    color: '#808080',
    fontStyle: 'italic',
    paddingVertical: 15,
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

  // Group items by delivery_date
  const itemsByDay = items.reduce((acc, item) => {
    const deliveryDate = item.delivery_date || 'Без даты';
    if (!acc[deliveryDate]) {
      acc[deliveryDate] = [];
    }
    acc[deliveryDate].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  // Sort days chronologically
  const sortedDays = Object.keys(itemsByDay).sort((a, b) => {
    if (a === 'Без даты') return 1;
    if (b === 'Без даты') return -1;
    return a.localeCompare(b);
  });

  // Format date for display (Russian)
  const formatDayHeader = (dateStr: string): { weekday: string; date: string } => {
    if (dateStr === 'Без даты') {
      return { weekday: 'Без даты доставки', date: '' };
    }
    
    const date = new Date(dateStr + 'T00:00:00');
    const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    return { 
      weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), 
      date: formattedDate 
    };
  };

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
          <Text style={styles.title}>ГРАФИК ПРОИЗВОДСТВА - ВЫПЕЧКА</Text>
          <Text style={styles.dateRange}>Период: {dateRange}</Text>
        </View>

        {/* Render items grouped by day */}
        {sortedDays.map((dayStr, dayIndex) => {
          const dayItems = itemsByDay[dayStr];
          const { weekday, date } = formatDayHeader(dayStr);
          
          return (
            <View key={dayStr} style={styles.daySection} wrap={false}>
              {/* Day Header */}
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{weekday}</Text>
                {date && <Text style={styles.dayDate}>{date}</Text>}
                <Text style={styles.dayCount}>
                  Заказов: {dayItems.length}
                </Text>
              </View>

              {/* Table for this day */}
              <View style={styles.table}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={styles.colOrderNum}>Заказ №</Text>
                  <Text style={styles.colProduct}>Продукт</Text>
                  <Text style={styles.colQty}>Кол-во</Text>
                  <Text style={styles.colSize}>Размер</Text>
                  <Text style={styles.colWeight}>Вес</Text>
                  <Text style={styles.colFlavor}>Вкус</Text>
                </View>

                {/* Table Rows */}
                {dayItems.map((item, index) => (
                  <View
                    key={item.id}
                    wrap={false}
                    style={[
                      styles.tableRow,
                      index % 2 === 1 ? styles.tableRowAlt : {},
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
                    <Text style={styles.colFlavor}>
                      {item.flavour_name || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Создано: {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
