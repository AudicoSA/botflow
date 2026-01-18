import { logger } from '../config/logger.js';

/**
 * Credential validation service for integration marketplace
 * Validates API keys and credentials before saving them
 */

interface ValidationResult {
  valid: boolean;
  message: string;
  details?: Record<string, any>;
}

// Type definitions for API responses
interface PaystackResponse {
  status: boolean;
  message?: string;
  data?: any;
}

interface ShopifyShopResponse {
  shop?: {
    name?: string;
    domain?: string;
  };
  errors?: string;
}

interface WooCommerceResponse {
  environment?: {
    version?: string;
  };
}

interface CourierGuyResponse {
  message?: string;
}

interface ClickatellResponse {
  balance?: number;
}

interface BulkSmsResponse {
  credits?: {
    balance?: number;
  };
}

export class CredentialValidatorService {
  /**
   * Validate credentials for a specific integration
   * @param integrationSlug The integration to validate credentials for
   * @param credentials The credentials to validate
   * @returns Validation result with status and message
   */
  async validateCredentials(
    integrationSlug: string,
    credentials: Record<string, any>
  ): Promise<ValidationResult> {
    // Get the validator for this integration
    const validator = this.getValidator(integrationSlug);

    if (!validator) {
      // No validator available, assume valid (for integrations without validation)
      logger.info({ integrationSlug }, 'No credential validator available, skipping validation');
      return { valid: true, message: 'No validation available for this integration' };
    }

    try {
      return await validator(credentials);
    } catch (error: any) {
      logger.error({ error, integrationSlug }, 'Credential validation failed');
      return {
        valid: false,
        message: error.message || 'Credential validation failed',
      };
    }
  }

  /**
   * Get the validator function for a specific integration
   */
  private getValidator(
    integrationSlug: string
  ): ((credentials: Record<string, any>) => Promise<ValidationResult>) | null {
    const validators: Record<
      string,
      (credentials: Record<string, any>) => Promise<ValidationResult>
    > = {
      // Payment Gateways - South Africa
      'payfast': this.validatePayFast.bind(this),
      'paystack': this.validatePaystack.bind(this),
      'yoco': this.validateYoco.bind(this),
      'ikhokha': this.validateIkhokha.bind(this),

      // E-commerce
      'shopify': this.validateShopify.bind(this),
      'woocommerce': this.validateWooCommerce.bind(this),

      // Shipping - South Africa
      'courier-guy': this.validateCourierGuy.bind(this),
      'shiplogic': this.validateShipLogic.bind(this),

      // Calendar
      'ical-sync': this.validateICalSync.bind(this),

      // Communication
      'clickatell': this.validateClickatell.bind(this),
      'bulksms': this.validateBulkSms.bind(this),
    };

    return validators[integrationSlug] || null;
  }

  /**
   * PayFast validation
   * https://developers.payfast.co.za/docs
   */
  private async validatePayFast(credentials: Record<string, any>): Promise<ValidationResult> {
    const { merchant_id, merchant_key, passphrase } = credentials;

    if (!merchant_id || !merchant_key) {
      return {
        valid: false,
        message: 'PayFast requires merchant_id and merchant_key',
      };
    }

    // PayFast doesn't have a direct validation endpoint
    // We verify the format and return success
    if (!/^\d+$/.test(merchant_id)) {
      return {
        valid: false,
        message: 'Invalid merchant_id format - should be numeric',
      };
    }

    if (merchant_key.length < 10) {
      return {
        valid: false,
        message: 'Invalid merchant_key format - too short',
      };
    }

    logger.info({ merchant_id }, 'PayFast credentials format validated');
    return {
      valid: true,
      message: 'PayFast credentials validated successfully',
      details: { merchant_id, has_passphrase: !!passphrase },
    };
  }

  /**
   * Paystack validation
   * https://paystack.com/docs/api
   */
  private async validatePaystack(credentials: Record<string, any>): Promise<ValidationResult> {
    const { secret_key, public_key } = credentials;

    if (!secret_key) {
      return {
        valid: false,
        message: 'Paystack requires a secret_key',
      };
    }

    // Validate key format
    if (!secret_key.startsWith('sk_')) {
      return {
        valid: false,
        message: 'Invalid Paystack secret_key format - should start with sk_',
      };
    }

    if (public_key && !public_key.startsWith('pk_')) {
      return {
        valid: false,
        message: 'Invalid Paystack public_key format - should start with pk_',
      };
    }

    try {
      // Test the API key by fetching balance
      const response = await fetch('https://api.paystack.co/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secret_key}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as PaystackResponse;

      if (data.status === true) {
        logger.info('Paystack credentials validated via API');
        return {
          valid: true,
          message: 'Paystack credentials validated successfully',
          details: { verified_via_api: true },
        };
      } else {
        return {
          valid: false,
          message: data.message || 'Paystack API validation failed',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Paystack API validation failed, using format validation only');
      // Fall back to format validation
      return {
        valid: true,
        message: 'Paystack credentials format validated (API check skipped)',
        details: { verified_via_api: false },
      };
    }
  }

  /**
   * Yoco validation
   * https://developer.yoco.com/online/overview/introduction
   */
  private async validateYoco(credentials: Record<string, any>): Promise<ValidationResult> {
    const { secret_key } = credentials;

    if (!secret_key) {
      return {
        valid: false,
        message: 'Yoco requires a secret_key',
      };
    }

    // Validate key format (Yoco keys start with sk_)
    if (!secret_key.startsWith('sk_')) {
      return {
        valid: false,
        message: 'Invalid Yoco secret_key format - should start with sk_',
      };
    }

    try {
      // Test the API key
      const response = await fetch('https://online.yoco.com/v1/businesses/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secret_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        logger.info('Yoco credentials validated via API');
        return {
          valid: true,
          message: 'Yoco credentials validated successfully',
          details: { verified_via_api: true },
        };
      } else {
        const data = await response.json() as { message?: string };
        return {
          valid: false,
          message: data.message || 'Yoco API validation failed',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Yoco API validation failed, using format validation only');
      return {
        valid: true,
        message: 'Yoco credentials format validated (API check skipped)',
        details: { verified_via_api: false },
      };
    }
  }

  /**
   * iKhokha (iK Pay) validation
   * https://api.ikhokha.com
   * South African payment gateway
   */
  private async validateIkhokha(credentials: Record<string, any>): Promise<ValidationResult> {
    const { application_id, application_secret } = credentials;

    if (!application_id || !application_secret) {
      return {
        valid: false,
        message: 'iKhokha requires application_id and application_secret',
      };
    }

    // Validate application_id format (should be non-empty string)
    if (application_id.length < 5) {
      return {
        valid: false,
        message: 'Invalid iKhokha application_id format - appears too short',
      };
    }

    // Validate application_secret format (should be non-empty string)
    if (application_secret.length < 10) {
      return {
        valid: false,
        message: 'Invalid iKhokha application_secret format - appears too short',
      };
    }

    // iKhokha uses HMAC-SHA256 signatures for API calls
    // We can't easily test the API without making a payment request
    // So we do format validation and return success
    logger.info({ application_id }, 'iKhokha credentials format validated');
    return {
      valid: true,
      message: 'iKhokha credentials validated successfully',
      details: {
        application_id,
        has_secret: true,
        note: 'Credentials will be verified on first payment request',
      },
    };
  }

  /**
   * Shopify validation
   * https://shopify.dev/docs/api/admin-rest
   */
  private async validateShopify(credentials: Record<string, any>): Promise<ValidationResult> {
    const { api_key, store_url } = credentials;

    if (!api_key || !store_url) {
      return {
        valid: false,
        message: 'Shopify requires api_key (access token) and store_url',
      };
    }

    // Validate store URL format
    let normalizedUrl = store_url;
    if (!normalizedUrl.includes('.myshopify.com')) {
      return {
        valid: false,
        message: 'Invalid Shopify store URL - should contain .myshopify.com',
      };
    }

    // Remove protocol if present
    normalizedUrl = normalizedUrl.replace(/^https?:\/\//, '');

    // Validate API key format
    if (!api_key.startsWith('shpat_') && !api_key.startsWith('shpca_')) {
      return {
        valid: false,
        message: 'Invalid Shopify API key format - should start with shpat_ or shpca_',
      };
    }

    try {
      // Test the API key by fetching shop info
      const response = await fetch(`https://${normalizedUrl}/admin/api/2024-01/shop.json`, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': api_key,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as ShopifyShopResponse;
        logger.info({ shop: data.shop?.name }, 'Shopify credentials validated via API');
        return {
          valid: true,
          message: 'Shopify credentials validated successfully',
          details: {
            verified_via_api: true,
            shop_name: data.shop?.name,
            shop_domain: data.shop?.domain,
          },
        };
      } else {
        const errorData = await response.json().catch(() => ({})) as ShopifyShopResponse;
        return {
          valid: false,
          message: errorData.errors || 'Shopify API validation failed - check your access token and store URL',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Shopify API validation failed');
      return {
        valid: false,
        message: 'Failed to connect to Shopify store - check your store URL',
      };
    }
  }

  /**
   * WooCommerce validation
   * https://woocommerce.github.io/woocommerce-rest-api-docs/
   */
  private async validateWooCommerce(credentials: Record<string, any>): Promise<ValidationResult> {
    const { consumer_key, consumer_secret, store_url } = credentials;

    if (!consumer_key || !consumer_secret || !store_url) {
      return {
        valid: false,
        message: 'WooCommerce requires consumer_key, consumer_secret, and store_url',
      };
    }

    // Validate key formats
    if (!consumer_key.startsWith('ck_')) {
      return {
        valid: false,
        message: 'Invalid WooCommerce consumer_key format - should start with ck_',
      };
    }

    if (!consumer_secret.startsWith('cs_')) {
      return {
        valid: false,
        message: 'Invalid WooCommerce consumer_secret format - should start with cs_',
      };
    }

    // Normalize store URL
    let normalizedUrl = store_url;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      // Test the API by fetching system status
      const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');
      const response = await fetch(`${normalizedUrl}/wp-json/wc/v3/system_status`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as WooCommerceResponse;
        logger.info('WooCommerce credentials validated via API');
        return {
          valid: true,
          message: 'WooCommerce credentials validated successfully',
          details: {
            verified_via_api: true,
            wc_version: data.environment?.version,
          },
        };
      } else {
        return {
          valid: false,
          message: 'WooCommerce API validation failed - check your credentials and store URL',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'WooCommerce API validation failed');
      return {
        valid: false,
        message: 'Failed to connect to WooCommerce store - check your store URL',
      };
    }
  }

  /**
   * The Courier Guy validation
   * South African courier service
   */
  private async validateCourierGuy(credentials: Record<string, any>): Promise<ValidationResult> {
    const { account_number, password } = credentials;

    if (!account_number || !password) {
      return {
        valid: false,
        message: 'The Courier Guy requires account_number and password',
      };
    }

    try {
      // Test authentication
      const response = await fetch('https://api.thecourierguy.co.za/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber: account_number,
          password: password,
        }),
      });

      if (response.ok) {
        logger.info('Courier Guy credentials validated via API');
        return {
          valid: true,
          message: 'The Courier Guy credentials validated successfully',
          details: { verified_via_api: true },
        };
      } else {
        const data = await response.json().catch(() => ({})) as CourierGuyResponse;
        return {
          valid: false,
          message: data.message || 'The Courier Guy authentication failed',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Courier Guy API validation failed, using format validation only');
      // Format validation only
      return {
        valid: true,
        message: 'Credentials format validated (API check unavailable)',
        details: { verified_via_api: false },
      };
    }
  }

  /**
   * ShipLogic validation
   * South African shipping aggregator
   */
  private async validateShipLogic(credentials: Record<string, any>): Promise<ValidationResult> {
    const { api_key } = credentials;

    if (!api_key) {
      return {
        valid: false,
        message: 'ShipLogic requires an api_key',
      };
    }

    if (api_key.length < 20) {
      return {
        valid: false,
        message: 'Invalid ShipLogic API key format - key appears too short',
      };
    }

    try {
      // Test the API key
      const response = await fetch('https://api.shiplogic.com/v2/rates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Minimal test request
          collection_address: { type: 'residential', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', postal_code: '2196', country: 'ZA' },
          delivery_address: { type: 'residential', suburb: 'Sea Point', city: 'Cape Town', province: 'Western Cape', postal_code: '8005', country: 'ZA' },
          parcels: [{ submitted_length_cm: 10, submitted_width_cm: 10, submitted_height_cm: 10, submitted_weight_kg: 1 }],
        }),
      });

      if (response.ok || response.status === 400) {
        // 400 might be returned for invalid address but means API key is valid
        logger.info('ShipLogic credentials validated via API');
        return {
          valid: true,
          message: 'ShipLogic credentials validated successfully',
          details: { verified_via_api: true },
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          valid: false,
          message: 'ShipLogic API key is invalid or expired',
        };
      } else {
        return {
          valid: true,
          message: 'ShipLogic credentials format validated (API returned unexpected status)',
          details: { verified_via_api: false, status: response.status },
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'ShipLogic API validation failed');
      return {
        valid: true,
        message: 'ShipLogic credentials format validated (API check unavailable)',
        details: { verified_via_api: false },
      };
    }
  }

  /**
   * iCal Sync validation (for Airbnb, Booking.com calendars)
   */
  private async validateICalSync(credentials: Record<string, any>): Promise<ValidationResult> {
    const { ical_urls } = credentials;

    if (!ical_urls || !Array.isArray(ical_urls) || ical_urls.length === 0) {
      return {
        valid: false,
        message: 'iCal Sync requires at least one calendar URL in ical_urls array',
      };
    }

    const results: { url: string; valid: boolean; error?: string }[] = [];

    for (const url of ical_urls) {
      try {
        // Validate URL format
        new URL(url);

        // Fetch and validate iCal content
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar',
          },
        });

        if (response.ok) {
          const content = await response.text();

          // Check if it's valid iCal format
          if (content.includes('BEGIN:VCALENDAR')) {
            results.push({ url, valid: true });
          } else {
            results.push({ url, valid: false, error: 'Not a valid iCal file' });
          }
        } else {
          results.push({ url, valid: false, error: `HTTP ${response.status}` });
        }
      } catch (error: any) {
        results.push({ url, valid: false, error: error.message });
      }
    }

    const validCount = results.filter(r => r.valid).length;
    const invalidResults = results.filter(r => !r.valid);

    if (validCount === 0) {
      return {
        valid: false,
        message: 'None of the provided calendar URLs are valid',
        details: { results },
      };
    }

    if (invalidResults.length > 0) {
      logger.warn({ invalidResults }, 'Some iCal URLs failed validation');
      return {
        valid: true,
        message: `${validCount} of ${ical_urls.length} calendar URLs validated successfully`,
        details: { results, valid_count: validCount },
      };
    }

    logger.info({ count: validCount }, 'All iCal URLs validated successfully');
    return {
      valid: true,
      message: 'All calendar URLs validated successfully',
      details: { results, valid_count: validCount },
    };
  }

  /**
   * Clickatell validation
   * South African SMS gateway
   */
  private async validateClickatell(credentials: Record<string, any>): Promise<ValidationResult> {
    const { api_key } = credentials;

    if (!api_key) {
      return {
        valid: false,
        message: 'Clickatell requires an api_key',
      };
    }

    try {
      // Check balance to validate the key
      const response = await fetch('https://platform.clickatell.com/v1/balance', {
        method: 'GET',
        headers: {
          'Authorization': api_key,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as ClickatellResponse;
        logger.info('Clickatell credentials validated via API');
        return {
          valid: true,
          message: 'Clickatell credentials validated successfully',
          details: { verified_via_api: true, balance: data.balance },
        };
      } else {
        return {
          valid: false,
          message: 'Clickatell API key is invalid',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'Clickatell API validation failed');
      // Format validation
      if (api_key.length >= 20) {
        return {
          valid: true,
          message: 'Clickatell credentials format validated (API check unavailable)',
          details: { verified_via_api: false },
        };
      }
      return {
        valid: false,
        message: 'Invalid Clickatell API key format',
      };
    }
  }

  /**
   * BulkSMS validation
   * SMS gateway
   */
  private async validateBulkSms(credentials: Record<string, any>): Promise<ValidationResult> {
    const { username, password } = credentials;

    if (!username || !password) {
      return {
        valid: false,
        message: 'BulkSMS requires username and password',
      };
    }

    try {
      // Check credits to validate credentials
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      const response = await fetch('https://api.bulksms.com/v1/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as BulkSmsResponse;
        logger.info('BulkSMS credentials validated via API');
        return {
          valid: true,
          message: 'BulkSMS credentials validated successfully',
          details: { verified_via_api: true, credits: data.credits?.balance },
        };
      } else {
        return {
          valid: false,
          message: 'BulkSMS credentials are invalid',
        };
      }
    } catch (error: any) {
      logger.warn({ error }, 'BulkSMS API validation failed');
      return {
        valid: true,
        message: 'BulkSMS credentials format validated (API check unavailable)',
        details: { verified_via_api: false },
      };
    }
  }
}

export const credentialValidatorService = new CredentialValidatorService();
