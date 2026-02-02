// BUSINESS CONTEXT: Client Invoice PDF - For business clients
// Used by: Owner for billing business clients
// 
// Shows: Orders summary with itemized products and totals
// Language: Italian (for Swiss invoicing)

import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface Order {
  id: string;
  order_number: string | null;
  total_amount: string;
  delivery_date: string | null;
  created_at: string;
  paid: boolean;
  channel: string;
  order_items?: OrderItem[];
}

interface Client {
  name: string;
  email: string | null;
  phone: string | null;
  id: string;
}

interface InvoicePDFProps {
  client: Client;
  orders: Order[];
  dateRange: {
    from: string | null;
    to: string | null;
  };
}

// Register fonts that support Cyrillic and extended Latin characters
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
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#533D29', // brown-700
    backgroundColor: '#F5E6D3', // cream-200
    padding: 8,
    borderRadius: 4,
    marginTop: 15,
    marginBottom: 20,
    width: 100,
    textAlign: 'center',
  },
  infoBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoBox: {
    width: '48%',
    backgroundColor: '#F9F6F1', // cream-100
    padding: 12,
    borderRadius: 6,
  },
  infoBoxTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B6B47', // brown-500
    marginBottom: 8,
  },
  infoBoxContent: {
    fontSize: 10,
    color: '#2C2C2C', // charcoal-900
    lineHeight: 1.5,
  },
  infoBoxName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#8B6B47', // brown-500
    padding: 8,
    borderBottom: '2 solid #533D29',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1 solid #EDD7B8',
    minHeight: 30,
    padding: 6,
  },
  tableRowAlt: {
    backgroundColor: '#FDFCFB', // cream-50
  },
  orderHeaderRow: {
    backgroundColor: '#F5E6D3', // cream-200
    padding: 6,
    fontWeight: 'bold',
  },
  // Column widths
  colProduct: {
    width: '50%',
    paddingRight: 8,
  },
  colQty: {
    width: '12%',
    textAlign: 'center',
  },
  colPrice: {
    width: '19%',
    textAlign: 'right',
    paddingRight: 8,
  },
  colSubtotal: {
    width: '19%',
    textAlign: 'right',
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FDFCFB', // cream-50
  },
  cellText: {
    fontSize: 10,
    color: '#2C2C2C',
  },
  cellTextBold: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2C2C2C',
  },
  orderHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#533D29', // brown-700
  },
  totalBox: {
    marginTop: 20,
    backgroundColor: '#8B6B47', // brown-500
    padding: 15,
    borderRadius: 6,
    alignSelf: 'flex-end',
    width: 200,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FDFCFB', // cream-50
    marginBottom: 5,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FDFCFB',
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

export default function InvoicePDF({ client, orders, dateRange }: InvoicePDFProps) {
  const generatedAt = new Date().toLocaleString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const invoiceNumber = `${new Date().getFullYear()}-${client.id.slice(0, 8)}`;
  const totalAmount = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

  const fromDateStr = dateRange.from || 'Inizio';
  const toDateStr = dateRange.to || 'Oggi';

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
        </View>

        {/* Invoice Title */}
        <Text style={styles.invoiceTitle}>Fattura</Text>

        {/* Client and Invoice Info Boxes */}
        <View style={styles.infoBoxes}>
          {/* Client Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Cliente</Text>
            <Text style={styles.infoBoxName}>{client.name}</Text>
            {client.email && (
              <Text style={styles.infoBoxContent}>{client.email}</Text>
            )}
            {client.phone && (
              <Text style={styles.infoBoxContent}>{client.phone}</Text>
            )}
          </View>

          {/* Invoice Info */}
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Dettagli Fattura</Text>
            <Text style={styles.infoBoxContent}>Periodo: {fromDateStr} - {toDateStr}</Text>
            <Text style={styles.infoBoxContent}>N. Fattura: {invoiceNumber}</Text>
            <Text style={styles.infoBoxContent}>
              Data: {new Date().toLocaleDateString('it-IT')}
            </Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, styles.colProduct]}>Prodotto</Text>
            <Text style={[styles.headerText, styles.colQty]}>Qta</Text>
            <Text style={[styles.headerText, styles.colPrice]}>Prezzo Unit.</Text>
            <Text style={[styles.headerText, styles.colSubtotal]}>Subtotale</Text>
          </View>

          {/* Table Rows */}
          {orders.map((order) => (
            <View key={order.id} wrap={false}>
              {/* Order Header Row */}
              <View style={styles.orderHeaderRow}>
                <Text style={styles.orderHeaderText}>
                  Ordine: {order.order_number || order.id.slice(0, 8)} | Consegna:{' '}
                  {order.delivery_date
                    ? new Date(order.delivery_date).toLocaleDateString('it-IT')
                    : '-'}
                </Text>
              </View>

              {/* Order Items */}
              {order.order_items && order.order_items.length > 0 ? (
                order.order_items.map((item, idx) => (
                  <View key={item.id} style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}>
                    <Text style={[styles.cellText, styles.colProduct]}>{item.product_name}</Text>
                    <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
                    <Text style={[styles.cellText, styles.colPrice]}>
                      CHF {parseFloat(item.unit_price).toFixed(2)}
                    </Text>
                    <Text style={[styles.cellTextBold, styles.colSubtotal]}>
                      CHF {parseFloat(item.subtotal).toFixed(2)}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.tableRow}>
                  <Text style={[styles.cellText, styles.colProduct]}>Ordine completo</Text>
                  <Text style={[styles.cellText, styles.colQty]}>1</Text>
                  <Text style={[styles.cellText, styles.colPrice]}>
                    CHF {parseFloat(order.total_amount).toFixed(2)}
                  </Text>
                  <Text style={[styles.cellTextBold, styles.colSubtotal]}>
                    CHF {parseFloat(order.total_amount).toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>Totale:</Text>
          <Text style={styles.totalAmount}>CHF {totalAmount.toFixed(2)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          Generato: {generatedAt}
        </Text>
      </Page>
    </Document>
  );
}
