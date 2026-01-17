import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

/**
 * Integration Testing Routes
 * Test external service credentials before saving
 */

const ShopifyTestSchema = z.object({
  api_key: z.string().min(1),
  store_url: z.string().min(1)
});

const WooCommerceTestSchema = z.object({
  consumer_key: z.string().min(1),
  consumer_secret: z.string().min(1),
  store_url: z.string().url()
});

const PaystackTestSchema = z.object({
  secret_key: z.string().min(1)
});

const integrationsTestRoutes: FastifyPluginAsync = async (fastify) => {
  // Test Shopify credentials
  fastify.post('/shopify/test', async (request, reply) => {
    try {
      const body = ShopifyTestSchema.parse(request.body);

      // Test Shopify API connection
      const shopUrl = body.store_url.replace('https://', '').replace('http://', '');
      const response = await fetch(`https://${shopUrl}/admin/api/2024-01/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': body.api_key,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return reply.code(400).send({
          success: false,
          message: 'Invalid Shopify credentials. Please check your API key and store URL.',
          error: errorText
        });
      }

      const data: any = await response.json();

      return reply.send({
        success: true,
        message: `Connected to ${data.shop?.name || 'Shopify store'} successfully!`,
        shop: {
          name: data.shop?.name,
          domain: data.shop?.domain
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      fastify.log.error({ error }, 'Shopify test error');
      return reply.code(500).send({
        success: false,
        message: 'Failed to test Shopify connection'
      });
    }
  });

  // Test WooCommerce credentials
  fastify.post('/woocommerce/test', async (request, reply) => {
    try {
      const body = WooCommerceTestSchema.parse(request.body);

      // Test WooCommerce API connection
      const auth = Buffer.from(`${body.consumer_key}:${body.consumer_secret}`).toString('base64');
      const response = await fetch(`${body.store_url}/wp-json/wc/v3/system_status`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid WooCommerce credentials. Please check your consumer key and secret.'
        });
      }

      const data: any = await response.json();

      return reply.send({
        success: true,
        message: 'Connected to WooCommerce store successfully!',
        store: {
          environment: data.environment?.wp_version
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      fastify.log.error({ error }, 'WooCommerce test error');
      return reply.code(500).send({
        success: false,
        message: 'Failed to test WooCommerce connection'
      });
    }
  });

  // Test Paystack credentials
  fastify.post('/paystack/test', async (request, reply) => {
    try {
      const body = PaystackTestSchema.parse(request.body);

      // Test Paystack API connection
      const response = await fetch('https://api.paystack.co/transaction/verify/invalid', {
        headers: {
          'Authorization': `Bearer ${body.secret_key}`,
          'Content-Type': 'application/json'
        }
      });

      // Paystack returns 404 for invalid transaction, which means the key is valid
      // A 401 would mean invalid credentials
      if (response.status === 401) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid Paystack secret key. Please check your credentials.'
        });
      }

      return reply.send({
        success: true,
        message: 'Paystack credentials verified successfully!'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      fastify.log.error({ error }, 'Paystack test error');
      return reply.code(500).send({
        success: false,
        message: 'Failed to test Paystack connection'
      });
    }
  });

  // Test generic HTTP endpoint
  fastify.post('/http/test', async (request, reply) => {
    try {
      const body = z.object({
        url: z.string().url(),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
        headers: z.record(z.string()).optional(),
        auth_type: z.enum(['none', 'basic', 'bearer', 'api_key']).default('none'),
        auth_credentials: z.record(z.string()).optional()
      }).parse(request.body);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(body.headers || {})
      };

      // Add authentication
      if (body.auth_type === 'bearer' && body.auth_credentials?.token) {
        headers['Authorization'] = `Bearer ${body.auth_credentials.token}`;
      } else if (body.auth_type === 'basic' && body.auth_credentials?.username && body.auth_credentials?.password) {
        const auth = Buffer.from(`${body.auth_credentials.username}:${body.auth_credentials.password}`).toString('base64');
        headers['Authorization'] = `Basic ${auth}`;
      } else if (body.auth_type === 'api_key' && body.auth_credentials?.key && body.auth_credentials?.header) {
        headers[body.auth_credentials.header] = body.auth_credentials.key;
      }

      const response = await fetch(body.url, {
        method: body.method,
        headers
      });

      if (!response.ok) {
        return reply.code(400).send({
          success: false,
          message: `HTTP request failed with status ${response.status}`,
          status: response.status
        });
      }

      return reply.send({
        success: true,
        message: 'HTTP endpoint is accessible!',
        status: response.status
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
      }

      fastify.log.error({ error }, 'HTTP test error');
      return reply.code(500).send({
        success: false,
        message: 'Failed to test HTTP endpoint'
      });
    }
  });
};

export default integrationsTestRoutes;
