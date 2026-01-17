import { z } from 'zod';

export const BotNameSchema = z.string()
  .min(3, 'Bot name must be at least 3 characters')
  .max(50, 'Bot name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Bot name can only contain letters, numbers, spaces, and hyphens');

export const ShopifyCredentialsSchema = z.object({
  api_key: z.string()
    .min(1, 'API Key is required')
    .regex(/^shpat_/, 'Invalid Shopify API key format'),
  store_url: z.string()
    .min(1, 'Store URL is required')
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, 'Invalid Shopify store URL format')
});

export const WooCommerceCredentialsSchema = z.object({
  consumer_key: z.string()
    .min(1, 'Consumer Key is required')
    .regex(/^ck_/, 'Invalid WooCommerce consumer key format'),
  consumer_secret: z.string()
    .min(1, 'Consumer Secret is required')
    .regex(/^cs_/, 'Invalid WooCommerce consumer secret format'),
  store_url: z.string()
    .url('Must be a valid URL')
    .min(1, 'Store URL is required')
});

export const PaystackCredentialsSchema = z.object({
  secret_key: z.string()
    .min(1, 'Secret Key is required')
    .regex(/^sk_(test|live)_/, 'Invalid Paystack secret key format')
});

export const EmailSchema = z.string()
  .email('Invalid email address');

export const PhoneSchema = z.string()
  .regex(/^(\+27|0)[0-9]{9}$/, 'Invalid South African phone number. Use format: +27XXXXXXXXX or 0XXXXXXXXX');

export const URLSchema = z.string()
  .url('Must be a valid URL');

export const WebhookSchema = z.object({
  url: URLSchema,
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  headers: z.record(z.string()).optional(),
  auth_type: z.enum(['none', 'basic', 'bearer', 'api_key']).optional()
});

// Generic validation helper
export function validateField<T>(schema: z.ZodSchema<T>, value: any): { success: boolean; error?: string } {
  try {
    schema.parse(value);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Validate multiple fields
export function validateFields(
  schemas: Record<string, z.ZodSchema>,
  values: Record<string, any>
): { success: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  let hasErrors = false;

  for (const [field, schema] of Object.entries(schemas)) {
    const result = validateField(schema, values[field]);
    if (!result.success && result.error) {
      errors[field] = result.error;
      hasErrors = true;
    }
  }

  return { success: !hasErrors, errors };
}
