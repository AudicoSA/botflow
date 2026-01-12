/**
 * Paystack Payment Service
 * Handles Paystack API operations for payments in South Africa
 */

import { FastifyBaseLogger } from 'fastify';
import crypto from 'crypto';
import {
  PaystackInitializeTransactionParams,
  PaystackInitializeTransactionResponse,
  PaystackVerifyTransactionResponse,
  PaystackChargeParams,
  PaystackChargeResponse,
  PaystackRefundParams,
  PaystackRefundResponse,
  PaystackCreatePlanParams,
  PaystackPlan,
  PaystackCreateSubscriptionParams,
  PaystackSubscription,
  PaystackListTransactionsParams,
  PaystackListTransactionsResponse,
  PaystackCreateCustomerParams,
  PaystackCreateCustomerResponse,
  PaystackWebhookEvent,
  PaystackTransaction,
} from '../types/payment.js';

export class PaystackService {
  private secretKey: string;
  private baseUrl = 'https://api.paystack.co';
  private logger: FastifyBaseLogger;

  constructor(secretKey: string, logger: FastifyBaseLogger) {
    this.secretKey = secretKey;
    this.logger = logger;
  }

  /**
   * Initialize a transaction
   * Returns authorization URL for customer to complete payment
   */
  async initializeTransaction(
    params: PaystackInitializeTransactionParams
  ): Promise<PaystackInitializeTransactionResponse> {
    try {
      // Generate unique reference if not provided
      if (!params.reference) {
        params.reference = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Default to ZAR
      if (!params.currency) {
        params.currency = 'ZAR';
      }

      // Default channels (card, bank, eft for SA)
      if (!params.channels) {
        params.channels = ['card', 'bank', 'eft'];
      }

      const response = await this.makeRequest<PaystackInitializeTransactionResponse>(
        'POST',
        '/transaction/initialize',
        params
      );

      this.logger.info(
        { reference: params.reference, amount: params.amount },
        'Transaction initialized'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to initialize transaction');
      throw new Error(`Failed to initialize transaction: ${error.message}`);
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackVerifyTransactionResponse> {
    try {
      const response = await this.makeRequest<PaystackVerifyTransactionResponse>(
        'GET',
        `/transaction/verify/${reference}`
      );

      this.logger.info(
        { reference, status: response.data.status },
        'Transaction verified'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, reference }, 'Failed to verify transaction');
      throw new Error(`Failed to verify transaction: ${error.message}`);
    }
  }

  /**
   * Charge a customer using saved authorization
   */
  async chargeAuthorization(params: PaystackChargeParams): Promise<PaystackChargeResponse> {
    try {
      // Generate unique reference if not provided
      if (!params.reference) {
        params.reference = `charge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      if (!params.currency) {
        params.currency = 'ZAR';
      }

      const response = await this.makeRequest<PaystackChargeResponse>(
        'POST',
        '/transaction/charge_authorization',
        params
      );

      this.logger.info(
        { reference: params.reference, amount: params.amount },
        'Authorization charged'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to charge authorization');
      throw new Error(`Failed to charge authorization: ${error.message}`);
    }
  }

  /**
   * Refund a transaction
   */
  async refundTransaction(params: PaystackRefundParams): Promise<PaystackRefundResponse> {
    try {
      const response = await this.makeRequest<PaystackRefundResponse>(
        'POST',
        '/refund',
        params
      );

      this.logger.info({ transaction: params.transaction }, 'Transaction refunded');

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to refund transaction');
      throw new Error(`Failed to refund transaction: ${error.message}`);
    }
  }

  /**
   * List transactions
   */
  async listTransactions(
    params: PaystackListTransactionsParams = {}
  ): Promise<PaystackListTransactionsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.perPage) queryParams.set('perPage', params.perPage.toString());
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.customer) queryParams.set('customer', params.customer.toString());
      if (params.status) queryParams.set('status', params.status);
      if (params.from) queryParams.set('from', params.from);
      if (params.to) queryParams.set('to', params.to);
      if (params.amount) queryParams.set('amount', params.amount.toString());

      const url = `/transaction?${queryParams.toString()}`;

      const response = await this.makeRequest<PaystackListTransactionsResponse>('GET', url);

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to list transactions');
      throw new Error(`Failed to list transactions: ${error.message}`);
    }
  }

  /**
   * Create a subscription plan
   */
  async createPlan(params: PaystackCreatePlanParams): Promise<{ status: boolean; message: string; data: PaystackPlan }> {
    try {
      if (!params.currency) {
        params.currency = 'ZAR';
      }

      const response = await this.makeRequest<{ status: boolean; message: string; data: PaystackPlan }>(
        'POST',
        '/plan',
        params
      );

      this.logger.info({ plan_code: response.data.plan_code }, 'Plan created');

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to create plan');
      throw new Error(`Failed to create plan: ${error.message}`);
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    params: PaystackCreateSubscriptionParams
  ): Promise<{ status: boolean; message: string; data: PaystackSubscription }> {
    try {
      const response = await this.makeRequest<{ status: boolean; message: string; data: PaystackSubscription }>(
        'POST',
        '/subscription',
        params
      );

      this.logger.info(
        { subscription_code: response.data.subscription_code },
        'Subscription created'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to create subscription');
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    code: string,
    token: string
  ): Promise<{ status: boolean; message: string }> {
    try {
      const response = await this.makeRequest<{ status: boolean; message: string }>(
        'POST',
        '/subscription/disable',
        { code, token }
      );

      this.logger.info({ subscription_code: code }, 'Subscription cancelled');

      return response;
    } catch (error) {
      this.logger.error({ error, code }, 'Failed to cancel subscription');
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Create a customer
   */
  async createCustomer(
    params: PaystackCreateCustomerParams
  ): Promise<PaystackCreateCustomerResponse> {
    try {
      const response = await this.makeRequest<PaystackCreateCustomerResponse>(
        'POST',
        '/customer',
        params
      );

      this.logger.info(
        { customer_code: response.data.customer_code },
        'Customer created'
      );

      return response;
    } catch (error) {
      this.logger.error({ error, params }, 'Failed to create customer');
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(
    payload: string,
    signature: string,
    webhookSecret: string
  ): Promise<PaystackWebhookEvent> {
    // Verify signature
    if (!this.verifyWebhookSignature(payload, signature, webhookSecret)) {
      this.logger.error('Invalid webhook signature');
      throw new Error('Invalid webhook signature');
    }

    try {
      const event: PaystackWebhookEvent = JSON.parse(payload);

      this.logger.info({ event: event.event }, 'Webhook received');

      return event;
    } catch (error) {
      this.logger.error({ error }, 'Failed to parse webhook payload');
      throw new Error('Invalid webhook payload');
    }
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(id: number): Promise<PaystackVerifyTransactionResponse> {
    try {
      const response = await this.makeRequest<PaystackVerifyTransactionResponse>(
        'GET',
        `/transaction/${id}`
      );

      return response;
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to get transaction');
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  /**
   * Convert Rands to Kobo (cents)
   * R100 = 10000 kobo
   */
  static randsToKobo(rands: number): number {
    return Math.round(rands * 100);
  }

  /**
   * Convert Kobo to Rands
   * 10000 kobo = R100
   */
  static koboToRands(kobo: number): number {
    return kobo / 100;
  }

  /**
   * Make authenticated request to Paystack API
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json() as any;

      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Paystack API request failed');
      }

      return data as T;
    } catch (error) {
      this.logger.error({ error, endpoint, method }, 'Paystack API request failed');
      throw error;
    }
  }
}
