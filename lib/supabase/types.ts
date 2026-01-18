// Database types generated from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Delivery Address type for structured JSONB storage
export interface DeliveryAddress {
  street: string
  city: string
  postalCode: string
  country: string
}

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          whatsapp: string | null
          instagram_handle: string | null
          preferred_contact: string | null
          first_order_date: string | null
          last_order_date: string | null
          total_orders: number | null
          total_spent: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          whatsapp?: string | null
          instagram_handle?: string | null
          preferred_contact?: string | null
          first_order_date?: string | null
          last_order_date?: string | null
          total_orders?: number | null
          total_spent?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          name: string
          email: string | null
          phone: string | null
          whatsapp: string | null
          instagram_handle: string | null
          preferred_contact: string | null
          first_order_date: string | null
          last_order_date: string | null
          total_orders: number | null
          total_spent: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }>
      }
      orders: {
        Row: {
          id: string
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          client_id: string
          total_amount: number
          currency: string
          delivery_type: string | null
          delivery_date: string | null
          delivery_time: string | null
          delivery_address: DeliveryAddress | null
          customer_notes: string | null
          channel: string | null
          created_by_user_id: string | null
          paid: boolean | null
          payment_method: string | null
          order_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          client_id: string
          total_amount: number
          currency?: string
          delivery_type?: string | null
          delivery_date?: string | null
          delivery_time?: string | null
          delivery_address?: DeliveryAddress | null
          customer_notes?: string | null
          channel?: string | null
          created_by_user_id?: string | null
          paid?: boolean | null
          payment_method?: string | null
          order_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          client_id: string
          total_amount: number
          currency: string
          delivery_type: string | null
          delivery_date: string | null
          delivery_time: string | null
          delivery_address: DeliveryAddress | null
          customer_notes: string | null
          channel: string | null
          created_by_user_id: string | null
          paid: boolean | null
          payment_method: string | null
          order_number: string | null
          created_at: string
          updated_at: string
        }>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_image_url: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size: string | null
          size_label: string | null
          selected_flavour: string | null
          flavour_name: string | null
          production_status: string | null
          order_number: string | null
          weight_kg: number | null
          diameter_cm: number | null
          product_category: string | null
          writing_on_cake: string | null
          internal_decoration_notes: string | null
          staff_notes: string | null
          delivery_date: string | null
          started_at: string | null
          completed_at: string | null
          updated_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          product_image_url?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size?: string | null
          size_label?: string | null
          selected_flavour?: string | null
          flavour_name?: string | null
          production_status?: string | null
          order_number?: string | null
          weight_kg?: number | null
          diameter_cm?: number | null
          product_category?: string | null
          writing_on_cake?: string | null
          internal_decoration_notes?: string | null
          staff_notes?: string | null
          delivery_date?: string | null
          started_at?: string | null
          completed_at?: string | null
          updated_at?: string | null
          created_at?: string
        }
        Update: Partial<{
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          product_image_url: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size: string | null
          size_label: string | null
          selected_flavour: string | null
          flavour_name: string | null
          production_status: string | null
          order_number: string | null
          weight_kg: number | null
          diameter_cm: number | null
          product_category: string | null
          writing_on_cake: string | null
          internal_decoration_notes: string | null
          staff_notes: string | null
          delivery_date: string | null
          started_at: string | null
          completed_at: string | null
          updated_at: string | null
          created_at: string
        }>
      }
    }
  }
}
