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

// Flavour color mapping - Standard flavours from Sanity
const FLAVOUR_COLORS: Record<string, { bg: string; text: string }> = {
  // Banana-caramel - Warm golden yellow
  '3dad1f6b-aa1b-410a-b77b-0472cc8eb3d1': {
    bg: '#FFE5B4',
    text: '#8B6914',
  },
  // Medovik (Honey Cake) - Honey amber
  '64421a16-d714-4b7f-83c4-5fa4494d3b93': {
    bg: '#FFBF6B',
    text: '#7D4E00',
  },
  // Vanilla - Light cream
  'db1b386a-799e-4483-b1b7-514e745bb86a': {
    bg: '#FFF8E7',
    text: '#8B7355',
  },
  // Double Chocolate - Rich brown
  'bc69466b-7b2d-412a-b5b3-7e952ab1dd93': {
    bg: '#D2691E',
    text: '#FFFFFF',
  },
  // Red Velvet - Deep red
  '1bdb031e-8b99-48d0-b1f0-7bd63375c92b': {
    bg: '#DC143C',
    text: '#FFFFFF',
  },
  // Merry Berry - Purple berry
  'deea7e22-8770-40a1-81ae-1d5c8a55bf64': {
    bg: '#9370DB',
    text: '#FFFFFF',
  },
  // Carrot Cake with Cinnamon - Warm orange
  '36966350-df0e-4337-abb0-364505971a25': {
    bg: '#FF8C42',
    text: '#5C2E00',
  },
};

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
  // Day section styles - Slimmer design
  daySection: {
    marginTop: 8,
    marginBottom: 8,
  },
  dayHeader: {
    backgroundColor: '#C9A871', // brown-400 (lighter, less attention)
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 6,
    borderRadius: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 9,
    color: '#F5E6D3', // cream-200
  },
  dayCount: {
    fontSize: 9,
    color: '#F5E6D3', // cream-200
    fontWeight: 'bold',
  },
  // Table styles
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B6B47', // brown-500 (main header)
    padding: 8,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontSize: 11,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #F5E6D3', // cream-200
    padding: 6,
    minHeight: 30,
    alignItems: 'center',
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
    paddingHorizontal: 4,
  },
  // Flavour badge styles
  flavourBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'center',
    textAlign: 'center',
  },
  flavourText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  customFlavourBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'center',
    textAlign: 'center',
    backgroundColor: '#E5E7EB', // gray-200
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#9CA3AF', // gray-400
  },
  customFlavourText: {
    fontSize: 9,
    fontWeight: 'normal',
    fontStyle: 'italic',
    color: '#4B5563', // gray-600
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

  // Render flavour badge with appropriate styling
  const renderFlavourBadge = (item: OrderItem) => {
    if (!item.flavour_name) {
      return <Text style={styles.colFlavor}>—</Text>;
    }

    // Check if it's a custom flavour
    const isCustom = item.selected_flavour === 'custom' || !item.selected_flavour;
    
    // Check if it's a standard flavour with color mapping
    const hasColorMapping = item.selected_flavour && FLAVOUR_COLORS[item.selected_flavour];

    if (isCustom || !hasColorMapping) {
      // Custom flavour - dashed border, gray style
      return (
        <View style={styles.colFlavor}>
          <View style={styles.customFlavourBadge}>
            <Text style={styles.customFlavourText}>{item.flavour_name}</Text>
          </View>
        </View>
      );
    }

    // Standard flavour - colored bubble
    const colors = FLAVOUR_COLORS[item.selected_flavour!];
    return (
      <View style={styles.colFlavor}>
        <View style={[styles.flavourBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.flavourText, { color: colors.text }]}>
            {item.flavour_name}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header with Logo */}
        <View style={styles.header} fixed>
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

        {/* Table Header - Fixed on every page */}
        <View style={styles.tableHeader} fixed>
          <Text style={styles.colOrderNum}>Заказ №</Text>
          <Text style={styles.colProduct}>Продукт</Text>
          <Text style={styles.colQty}>Кол-во</Text>
          <Text style={styles.colSize}>Размер</Text>
          <Text style={styles.colWeight}>Вес</Text>
          <Text style={styles.colFlavor}>Вкус</Text>
        </View>

        {/* Render items grouped by day */}
        {sortedDays.map((dayStr, dayIndex) => {
          const dayItems = itemsByDay[dayStr];
          const { weekday, date } = formatDayHeader(dayStr);
          
          return (
            <View key={dayStr} style={styles.daySection}>
              {/* Slimmer Day Header */}
              <View style={styles.dayHeader} wrap={false}>
                <Text style={styles.dayTitle}>{weekday}</Text>
                {date && <Text style={styles.dayDate}>{date}</Text>}
                <Text style={styles.dayCount}>
                  {dayItems.length} зак.
                </Text>
              </View>

              {/* Table Rows for this day */}
              <View style={styles.table}>
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
                    {renderFlavourBadge(item)}
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
