/**
 * Payment Routes (Paystack)
 * Handles payment initialization, verification, subscriptions
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';
import { PaystackService } from '../services/paystack.service.js';

// Validation schemas
const initializePaymentSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(), // Amount in Rands
  currency: z.enum(['ZAR', 'USD']).optional(),
  reference: z.string().optional(),
  callback_url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
  channels: z.array(z.enum(['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'])).optional(),
});

const verifyPaymentSchema = z.object({
  reference: z.string(),
});

const chargeAuthorizationSchema = z.object({
  email: z.string().email(),
  amount: z.number().positive(), // Amount in Rands
  authorization_code: z.string(),
  reference: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const refundPaymentSchema = z.object({
  transaction: z.union([z.string(), z.number()]),
  amount: z.number().positive().optional(), // Amount in Rands (partial refund)
  customer_note: z.string().optional(),
  merchant_note: z.string().optional(),
});

const createPlanSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive(), // Amount in Rands
  interval: z.enum(['hourly', 'daily', 'weekly', 'monthly', 'annually']),
  description: z.string().optional(),
  currency: z.enum(['ZAR', 'USD']).optional(),
});

const createSubscriptionSchema = z.object({
  customer: z.string(), // Email or customer code
  plan: z.string(), // Plan code
  authorization: z.string().optional(),
  start_date: z.string().optional(),
});

export default async function paymentRoutes(fastify: FastifyInstance) {
  // Check if Paystack is configured
  if (!env.PAYSTACK_SECRET_KEY) {
    fastify.log.warn('Paystack not configured - payment endpoints disabled');
    return;
  }

  const paystack = new PaystackService(env.PAYSTACK_SECRET_KEY, fastify.log);

  /**
   * Initialize a payment
   * POST /api/payments/initialize
   */
  fastify.post('/initialize', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = initializePaymentSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Convert Rands to Kobo (cents)
      const amountInKobo = PaystackService.randsToKobo(validation.data.amount);

      // Initialize transaction with Paystack
      const response = await paystack.initializeTransaction({
        email: validation.data.email,
        amount: amountInKobo,
        currency: validation.data.currency || 'ZAR',
        reference: validation.data.reference,
        callback_url: validation.data.callback_url || `${env.FRONTEND_URL}/dashboard/payments/verify`,
        metadata: validation.data.metadata,
        channels: validation.data.channels,
      });

      // Store payment record in database
      const { data: payment, error: dbError } = await supabaseAdmin
        .from('payments')
        .insert({
          organization_id: organizationId,
          provider: 'paystack',
          provider_reference: response.data.reference,
          amount: amountInKobo,
          currency: validation.data.currency || 'ZAR',
          status: 'pending',
          payment_type: 'initialize',
          customer_email: validation.data.email,
          metadata: validation.data.metadata,
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error(dbError, 'Failed to store payment record');
        return reply.code(500).send({ error: 'Failed to create payment record' });
      }

      return {
        success: true,
        payment_id: payment.id,
        authorization_url: response.data.authorization_url,
        access_code: response.data.access_code,
        reference: response.data.reference,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to initialize payment');
      return reply.code(500).send({ error: error.message || 'Failed to initialize payment' });
    }
  });

  /**
   * Verify a payment
   * GET /api/payments/verify/:reference
   */
  fastify.get('/verify/:reference', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { reference } = request.params as { reference: string };

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Verify with Paystack
      const response = await paystack.verifyTransaction(reference);

      // Update payment record in database
      const { data: payment, error: dbError } = await supabaseAdmin
        .from('payments')
        .update({
          status: response.data.status === 'success' ? 'success' : 'failed',
          provider_transaction_id: response.data.id.toString(),
          payment_method: response.data.channel,
          completed_at: response.data.paid_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('provider_reference', reference)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (dbError) {
        fastify.log.error(dbError, 'Failed to update payment record');
      }

      return {
        success: response.data.status === 'success',
        status: response.data.status,
        amount: PaystackService.koboToRands(response.data.amount),
        currency: response.data.currency,
        reference: response.data.reference,
        paid_at: response.data.paid_at,
        channel: response.data.channel,
        payment: payment,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to verify payment');
      return reply.code(500).send({ error: error.message || 'Failed to verify payment' });
    }
  });

  /**
   * Charge a saved authorization (recurring payment)
   * POST /api/payments/charge
   */
  fastify.post('/charge', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = chargeAuthorizationSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Convert Rands to Kobo
      const amountInKobo = PaystackService.randsToKobo(validation.data.amount);

      // Charge authorization
      const response = await paystack.chargeAuthorization({
        email: validation.data.email,
        amount: amountInKobo,
        authorization_code: validation.data.authorization_code,
        reference: validation.data.reference,
        currency: 'ZAR',
        metadata: validation.data.metadata,
      });

      // Store payment record
      const { data: payment, error: dbError } = await supabaseAdmin
        .from('payments')
        .insert({
          organization_id: organizationId,
          provider: 'paystack',
          provider_reference: response.data.reference,
          provider_transaction_id: response.data.id.toString(),
          amount: amountInKobo,
          currency: 'ZAR',
          status: response.data.status === 'success' ? 'success' : 'failed',
          payment_type: 'charge',
          payment_method: response.data.channel,
          customer_email: validation.data.email,
          metadata: validation.data.metadata,
          completed_at: response.data.paid_at,
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error(dbError, 'Failed to store payment record');
      }

      return {
        success: response.data.status === 'success',
        status: response.data.status,
        amount: PaystackService.koboToRands(response.data.amount),
        reference: response.data.reference,
        payment: payment,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to charge authorization');
      return reply.code(500).send({ error: error.message || 'Failed to charge authorization' });
    }
  });

  /**
   * Refund a payment
   * POST /api/payments/refund
   */
  fastify.post('/refund', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = refundPaymentSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Convert amount to Kobo if provided
      const amountInKobo = validation.data.amount
        ? PaystackService.randsToKobo(validation.data.amount)
        : undefined;

      // Process refund
      const response = await paystack.refundTransaction({
        transaction: validation.data.transaction,
        amount: amountInKobo,
        currency: 'ZAR',
        customer_note: validation.data.customer_note,
        merchant_note: validation.data.merchant_note,
      });

      // Update payment record
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_reference', validation.data.transaction.toString())
        .eq('organization_id', organizationId);

      return {
        success: true,
        refund_id: response.data.id,
        amount: PaystackService.koboToRands(response.data.amount),
        status: response.data.status,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to refund payment');
      return reply.code(500).send({ error: error.message || 'Failed to refund payment' });
    }
  });

  /**
   * Create a subscription plan
   * POST /api/payments/plans
   */
  fastify.post('/plans', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = createPlanSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      // Convert Rands to Kobo
      const amountInKobo = PaystackService.randsToKobo(validation.data.amount);

      const response = await paystack.createPlan({
        name: validation.data.name,
        amount: amountInKobo,
        interval: validation.data.interval,
        description: validation.data.description,
        currency: validation.data.currency || 'ZAR',
      });

      return {
        success: true,
        plan: response.data,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to create plan');
      return reply.code(500).send({ error: error.message || 'Failed to create plan' });
    }
  });

  /**
   * Create a subscription
   * POST /api/payments/subscriptions
   */
  fastify.post('/subscriptions', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const validation = createSubscriptionSchema.safeParse(request.body);
      if (!validation.success) {
        return reply.code(400).send({
          error: 'Invalid request',
          details: validation.error.errors,
        });
      }

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      const response = await paystack.createSubscription({
        customer: validation.data.customer,
        plan: validation.data.plan,
        authorization: validation.data.authorization,
        start_date: validation.data.start_date,
      });

      // Store subscription record
      const { data: subscription, error: dbError } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          organization_id: organizationId,
          provider: 'paystack',
          provider_subscription_id: response.data.subscription_code,
          provider_customer_code: response.data.email_token,
          plan_code: validation.data.plan,
          amount: response.data.amount,
          currency: 'ZAR',
          interval: response.data.cron_expression,
          status: 'active',
          next_payment_date: response.data.next_payment_date,
        })
        .select()
        .single();

      if (dbError) {
        fastify.log.error(dbError, 'Failed to store subscription record');
      }

      return {
        success: true,
        subscription: response.data,
        subscription_id: subscription?.id,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to create subscription');
      return reply.code(500).send({ error: error.message || 'Failed to create subscription' });
    }
  });

  /**
   * List payments
   * GET /api/payments
   */
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { page = 1, perPage = 20, status } = request.query as any;

      const userId = (request.user as any).id;

      // Get organization
      const { data: orgs } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1);

      const organizationId = orgs?.[0]?.organization_id;
      if (!organizationId) {
        return reply.code(400).send({ error: 'Organization not found' });
      }

      // Query payments from database
      let query = supabaseAdmin
        .from('payments')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: payments, error: dbError, count } = await query;

      if (dbError) {
        fastify.log.error(dbError, 'Failed to fetch payments');
        return reply.code(500).send({ error: 'Failed to fetch payments' });
      }

      // Convert amounts from kobo to rands
      const paymentsInRands = payments?.map((p) => ({
        ...p,
        amount: PaystackService.koboToRands(p.amount),
      }));

      return {
        payments: paymentsInRands,
        pagination: {
          page: parseInt(page),
          perPage: parseInt(perPage),
          total: count,
          totalPages: Math.ceil((count || 0) / perPage),
        },
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to list payments');
      return reply.code(500).send({ error: 'Failed to list payments' });
    }
  });

  /**
   * Paystack webhook handler
   * POST /webhooks/paystack
   */
  fastify.post('/webhook', async (request, reply) => {
    try {
      const signature = request.headers['x-paystack-signature'] as string;

      if (!signature || !env.PAYSTACK_WEBHOOK_SECRET) {
        return reply.code(400).send({ error: 'Missing webhook signature or secret' });
      }

      const payload = JSON.stringify(request.body);

      // Verify and parse webhook
      const event = await paystack.handleWebhook(
        payload,
        signature,
        env.PAYSTACK_WEBHOOK_SECRET
      );

      // Handle different event types
      switch (event.event) {
        case 'charge.success':
          // Update payment status
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'success',
              provider_transaction_id: event.data.id?.toString(),
              completed_at: event.data.paid_at,
              updated_at: new Date().toISOString(),
            })
            .eq('provider_reference', event.data.reference);

          fastify.log.info({ reference: event.data.reference }, 'Payment success webhook processed');
          break;

        case 'charge.failed':
          // Update payment status
          await supabaseAdmin
            .from('payments')
            .update({
              status: 'failed',
              updated_at: new Date().toISOString(),
            })
            .eq('provider_reference', event.data.reference);

          fastify.log.info({ reference: event.data.reference }, 'Payment failed webhook processed');
          break;

        case 'subscription.create':
          fastify.log.info({ subscription: event.data.subscription_code }, 'Subscription created webhook');
          break;

        case 'subscription.disable':
          // Cancel subscription
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
            })
            .eq('provider_subscription_id', event.data.subscription_code);

          fastify.log.info({ subscription: event.data.subscription_code }, 'Subscription disabled webhook processed');
          break;

        default:
          fastify.log.info({ event: event.event }, 'Unhandled webhook event');
      }

      return { success: true };
    } catch (error) {
      fastify.log.error(error, 'Webhook processing failed');
      return reply.code(400).send({ error: 'Webhook processing failed' });
    }
  });
}
