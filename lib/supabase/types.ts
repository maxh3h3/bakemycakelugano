// Database types generated from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: string
          stripe_session_id: string
          stripe_payment_intent_id: string | null
          stripe_payment_status: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          total_amount: number
          currency: string
          status: string
          delivery_type: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_postal_code: string | null
          delivery_country: string | null
          special_instructions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          stripe_session_id: string
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          total_amount: number
          currency?: string
          status?: string
          delivery_type?: string | null
          delivery_address?: string | null
          delivery_city?: string | null
          delivery_postal_code?: string | null
          delivery_country?: string | null
          special_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<{
          id: string
          stripe_session_id: string
          stripe_payment_intent_id: string | null
          stripe_payment_status: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          total_amount: number
          currency: string
          status: string
          delivery_type: string | null
          delivery_address: string | null
          delivery_city: string | null
          delivery_postal_code: string | null
          delivery_country: string | null
          special_instructions: string | null
          created_at: string
          updated_at: string
        }>
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_image_url: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size: string | null
          size_label: string | null
          selected_flavour: string | null
          flavour_name: string | null
          delivery_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_image_url?: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size?: string | null
          size_label?: string | null
          selected_flavour?: string | null
          flavour_name?: string | null
          delivery_date?: string | null
          created_at?: string
        }
        Update: Partial<{
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_image_url: string | null
          quantity: number
          unit_price: number
          subtotal: number
          selected_size: string | null
          size_label: string | null
          selected_flavour: string | null
          flavour_name: string | null
          delivery_date: string | null
          created_at: string
        }>
      }
    }
  }
}

