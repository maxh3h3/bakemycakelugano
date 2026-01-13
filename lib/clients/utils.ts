import { supabaseAdmin } from '@/lib/supabase/server';
import type { Client, NewClient } from '@/lib/db/schema';

/**
 * Contact information for finding or creating a client
 */
export interface ClientContactInfo {
  name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  instagramHandle?: string | null;
  preferredContact?: 'email' | 'phone' | 'whatsapp' | 'instagram' | null;
  notes?: string | null;
}

/**
 * Result of findOrCreateClient operation
 */
export interface FindOrCreateClientResult {
  client: Client;
  isNew: boolean;
}

/**
 * Search result for client autocomplete
 */
export interface ClientSearchResult {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  instagramHandle: string | null;
  preferredContact: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderDate: string | null;
}

/**
 * Infer preferred contact method from order channel
 */
export function inferPreferredContact(
  channel: string | null,
  contactInfo: ClientContactInfo
): 'email' | 'phone' | 'whatsapp' | 'instagram' | null {
  // If already specified, use it
  if (contactInfo.preferredContact) {
    return contactInfo.preferredContact;
  }

  // Infer from channel
  switch (channel) {
    case 'instagram':
      return 'instagram';
    case 'email':
      return 'email';
    case 'whatsapp':
      return 'whatsapp';
    case 'phone':
    case 'walk_in':
      return contactInfo.phone ? 'phone' : null;
    default:
      // Fallback: prefer email, then phone, then instagram
      if (contactInfo.email) return 'email';
      if (contactInfo.phone) return 'phone';
      if (contactInfo.instagramHandle) return 'instagram';
      return null;
  }
}

/**
 * Find existing client by email or phone, or create a new one
 * Matches by email (case-insensitive) or phone number
 */
export async function findOrCreateClient(
  contactInfo: ClientContactInfo,
  channel?: string | null
): Promise<FindOrCreateClientResult> {
  const { name, email, phone, whatsapp, instagramHandle, notes } = contactInfo;

  // Validate: at least one contact method is required
  if (!email && !phone && !instagramHandle) {
    throw new Error('At least one contact method (email, phone, or Instagram) is required');
  }

  try {
    // Step 1: Try to find existing client by email (case-insensitive) or phone
    let existingClient: Client | null = null;

    if (email) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .ilike('email', email)
        .limit(1)
        .single();

      if (!error && data) {
        existingClient = data as Client;
      }
    }

    // If not found by email, try phone
    if (!existingClient && phone) {
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('phone', phone)
        .limit(1)
        .single();

      if (!error && data) {
        existingClient = data as Client;
      }
    }

    // Step 2: If client exists, optionally update contact info if more complete
    if (existingClient) {
      // Check if we should update any fields (e.g., adding missing contact methods)
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      if (email && !existingClient.email) {
        updates.email = email;
        needsUpdate = true;
      }
      if (phone && !existingClient.phone) {
        updates.phone = phone;
        needsUpdate = true;
      }
      if (whatsapp && !existingClient.whatsapp) {
        updates.whatsapp = whatsapp;
        needsUpdate = true;
      }
      if (instagramHandle && !existingClient.instagramHandle) {
        updates.instagram_handle = instagramHandle; // snake_case for DB
        needsUpdate = true;
      }

      // Update preferred contact if not set
      if (!existingClient.preferredContact && channel) {
        const inferred = inferPreferredContact(channel, contactInfo);
        if (inferred) {
          updates.preferred_contact = inferred; // snake_case for DB
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        const { data: updatedClient, error: updateError } = await (supabaseAdmin
          .from('clients')
          .update(updates)
          .eq('id', existingClient.id)
          .select()
          .single() as Promise<{ data: Client | null; error: any }>);

        if (updateError) {
          console.error('Error updating client:', updateError);
          // Return existing client even if update fails
          return { client: existingClient, isNew: false };
        }

        return { client: updatedClient as Client, isNew: false };
      }

      return { client: existingClient, isNew: false };
    }

    // Step 3: Create new client
    const preferredContact = inferPreferredContact(channel || null, contactInfo);

    // Use snake_case for Supabase column names
    const newClientData = {
      name,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || phone || null, // Default whatsapp to phone if not provided
      instagram_handle: instagramHandle || null,
      preferred_contact: preferredContact || null,
      notes: notes || null,
      total_orders: 0,
      total_spent: '0',
      first_order_date: null,
      last_order_date: null,
    };

    const { data: newClient, error: createError } = await (supabaseAdmin
      .from('clients')
      .insert(newClientData)
      .select()
      .single() as Promise<{ data: Client | null; error: any }>);

    if (createError) {
      throw new Error(`Failed to create client: ${createError.message}`);
    }

    return { client: newClient as Client, isNew: true };
  } catch (error) {
    console.error('Error in findOrCreateClient:', error);
    throw error;
  }
}

/**
 * Update client statistics (total orders, total spent, first/last order dates)
 * Call this after creating or updating an order
 */
export async function updateClientStats(clientId: string): Promise<void> {
  try {
    // Calculate stats from orders
    const { data: stats, error: statsError } = await (supabaseAdmin
      .from('orders')
      .select('total_amount, created_at, delivery_date')
      .eq('client_id', clientId) as Promise<{ 
        data: Array<{ total_amount: string; created_at: string; delivery_date: string | null }> | null; 
        error: any 
      }>);

    if (statsError) {
      throw new Error(`Failed to fetch order stats: ${statsError.message}`);
    }

    if (!stats || stats.length === 0) {
      // No orders for this client, reset stats
      await (supabaseAdmin
        .from('clients')
        .update({
          total_orders: 0,
          total_spent: '0',
          first_order_date: null,
          last_order_date: null,
        })
        .eq('id', clientId));
      return;
    }

    // Calculate aggregates
    const totalOrders = stats.length;
    const totalSpent = stats.reduce((sum, order) => {
      return sum + parseFloat(order.total_amount || '0');
    }, 0);

    // Find first and last order dates
    const sortedDates = stats
      .map((order) => order.created_at)
      .filter((date) => date)
      .sort();

    // Use UTC date for consistency with timestamp fields (created_at is stored in UTC)
    const firstOrderDate = sortedDates[0] ? new Date(sortedDates[0]).toISOString().split('T')[0] : null;
    const lastOrderDate = sortedDates[sortedDates.length - 1]
      ? new Date(sortedDates[sortedDates.length - 1]).toISOString().split('T')[0]
      : null;

    // Update client
    const { error: updateError } = await (supabaseAdmin
      .from('clients')
      .update({
        total_orders: totalOrders,
        total_spent: totalSpent.toFixed(2),
        first_order_date: firstOrderDate,
        last_order_date: lastOrderDate,
      })
      .eq('id', clientId));

    if (updateError) {
      throw new Error(`Failed to update client stats: ${updateError.message}`);
    }
  } catch (error) {
    console.error('Error updating client stats:', error);
    throw error;
  }
}

/**
 * Search clients by name, email, or phone
 * Returns results sorted by relevance and total orders
 */
export async function searchClients(
  query: string,
  limit: number = 10
): Promise<ClientSearchResult[]> {
  try {
    if (!query || query.trim().length < 2) {
      // For very short queries, return recent clients
      const { data, error } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, instagram_handle, preferred_contact, total_orders, total_spent, last_order_date')
        .order('last_order_date', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) {
        throw new Error(`Search error: ${error.message}`);
      }

      return (data || []).map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        instagramHandle: client.instagram_handle,
        preferredContact: client.preferred_contact,
        totalOrders: client.total_orders || 0,
        totalSpent: client.total_spent || '0',
        lastOrderDate: client.last_order_date,
      }));
    }

    const searchTerm = query.trim().toLowerCase();

    // Search across name, email, and phone
    const { data, error } = await (supabaseAdmin
      .from('clients')
      .select('id, name, email, phone, instagram_handle, preferred_contact, total_orders, total_spent, last_order_date')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      .order('total_orders', { ascending: false })
      .limit(limit) as Promise<{ 
        data: Array<{
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          instagram_handle: string | null;
          preferred_contact: string | null;
          total_orders: number | null;
          total_spent: string | null;
          last_order_date: string | null;
        }> | null;
        error: any;
      }>);

    if (error) {
      throw new Error(`Search error: ${error.message}`);
    }

    return (data || []).map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      instagramHandle: client.instagram_handle,
      preferredContact: client.preferred_contact,
      totalOrders: client.total_orders || 0,
      totalSpent: client.total_spent || '0',
      lastOrderDate: client.last_order_date,
    }));
  } catch (error) {
    console.error('Error searching clients:', error);
    throw error;
  }
}

/**
 * Get a single client by ID with full details
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data as Client;
  } catch (error) {
    console.error('Error fetching client:', error);
    throw error;
  }
}

/**
 * Delete a client (soft delete - only if no orders)
 */
export async function deleteClient(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if client has orders
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);

    if (ordersError) {
      return { success: false, error: `Failed to check orders: ${ordersError.message}` };
    }

    if (orders && orders.length > 0) {
      return { success: false, error: 'Cannot delete client with existing orders' };
    }

    // Delete client
    const { error: deleteError } = await supabaseAdmin
      .from('clients')
      .delete()
      .eq('id', clientId);

    if (deleteError) {
      return { success: false, error: `Failed to delete client: ${deleteError.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, error: 'Internal error deleting client' };
  }
}
