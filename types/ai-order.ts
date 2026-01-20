/**
 * AI-extracted order data structure
 * This matches the CreateOrderModal form fields for seamless pre-filling
 */

export interface AIExtractedOrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  selected_flavour?: string | null;
  flavour_name?: string | null;
  weight_kg?: string | null;
  diameter_cm?: number | null;
  writing_on_cake?: string | null;
  internal_decoration_notes?: string | null;
  staff_notes?: string | null;
}

export interface AIExtractedOrderData {
  // Customer information
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_ig_handle?: string;
  
  // Delivery information
  delivery_date?: string; // ISO date string YYYY-MM-DD
  delivery_time?: string;
  delivery_type?: 'pickup' | 'delivery';
  delivery_address?: string;
  delivery_city?: string;
  delivery_postal_code?: string;
  delivery_country?: string;
  
  // Channel detection
  channel?: 'phone' | 'whatsapp' | 'instagram' | 'email' | 'walk_in';
  
  // Order details
  customer_notes?: string;
  payment_method?: 'cash' | 'twint' | 'stripe' | '';
  paid?: boolean;
  
  // Order items
  order_items: AIExtractedOrderItem[];
  
  // Confidence and reasoning (for debugging/transparency)
  confidence?: 'high' | 'medium' | 'low';
  ai_notes?: string; // What the AI inferred or couldn't determine
}

export interface AIOrderProcessingRequest {
  // Text input (from voice transcription or direct input)
  text?: string;
  
  // Image inputs (base64 encoded)
  images?: string[];
  
  // Context hints (optional)
  context?: {
    defaultCountry?: string;
    currentDate?: string;
  };
}

export interface AIOrderProcessingResponse {
  success: boolean;
  data?: AIExtractedOrderData;
  error?: string;
  processingTime?: number;
}
