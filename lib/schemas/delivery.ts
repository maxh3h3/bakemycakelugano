import { z } from 'zod';

/**
 * Delivery Address Schema
 * Validates the structured address for delivery orders
 * Note: city and postalCode are optional as address can be stored as a single field in street
 */
export const DeliveryAddressSchema = z.object({
  street: z.string().min(3, 'Street address must be at least 3 characters'),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default('Switzerland'),
});

/**
 * Optional delivery address (can be null for pickup orders)
 */
export const OptionalDeliveryAddressSchema = DeliveryAddressSchema.nullable();

/**
 * TypeScript type inferred from the Zod schema
 */
export type DeliveryAddress = z.infer<typeof DeliveryAddressSchema>;

/**
 * Helper function to format delivery address as a single string
 */
export function formatDeliveryAddress(address: DeliveryAddress | null): string {
  if (!address) return '';
  
  const parts = [
    address.street,
    `${address.postalCode} ${address.city}`,
    address.country !== 'Switzerland' ? address.country : null
  ].filter(Boolean);
  
  return parts.join(', ');
}

/**
 * Helper function to validate delivery address for delivery orders
 */
export function validateDeliveryAddress(
  deliveryType: 'pickup' | 'delivery' | 'immediate' | null,
  address: unknown
): { success: boolean; data?: DeliveryAddress | null; error?: string } {
  if (deliveryType === 'pickup' || deliveryType === 'immediate' || !deliveryType) {
    // For pickup and immediate orders, address should be null
    return { success: true, data: null };
  }
  
  // For delivery orders, validate the address
  const result = DeliveryAddressSchema.safeParse(address);
  
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map(e => e.message).join(', ')
    };
  }
  
  return { success: true, data: result.data };
}

