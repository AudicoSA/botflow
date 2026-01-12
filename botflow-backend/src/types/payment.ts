/**
 * Paystack Payment Integration Types
 * Based on Paystack API v1
 */

export interface PaystackInitializeTransactionParams {
  email: string;
  amount: number; // Amount in kobo (cents) - R100 = 10000
  currency?: 'ZAR' | 'NGN' | 'GHS' | 'USD';
  reference?: string; // Unique transaction reference
  callback_url?: string;
  metadata?: Record<string, any>;
  channels?: Array<'card' | 'bank' | 'ussd' | 'qr' | 'mobile_money' | 'bank_transfer' | 'eft'>;
  subaccount?: string;
  transaction_charge?: number;
  bearer?: 'account' | 'subaccount';
}

export interface PaystackInitializeTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyTransactionResponse {
  status: boolean;
  message: string;
  data: PaystackTransaction;
}

export interface PaystackTransaction {
  id: number;
  domain: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string;
  metadata: Record<string, any>;
  log: any;
  fees: number;
  fees_split: any;
  authorization: PaystackAuthorization;
  customer: PaystackCustomer;
  plan: any;
  requested_amount: number;
}

export interface PaystackAuthorization {
  authorization_code: string;
  bin: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  channel: string;
  card_type: string;
  bank: string;
  country_code: string;
  brand: string;
  reusable: boolean;
  signature: string;
  account_name: string | null;
}

export interface PaystackCustomer {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  customer_code: string;
  phone: string | null;
  metadata: Record<string, any>;
  risk_action: string;
}

export interface PaystackChargeParams {
  email: string;
  amount: number; // Amount in kobo
  authorization_code: string; // From previous successful transaction
  reference?: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaystackChargeResponse {
  status: boolean;
  message: string;
  data: PaystackTransaction;
}

export interface PaystackRefundParams {
  transaction: string | number; // Transaction reference or ID
  amount?: number; // Amount in kobo (partial refund)
  currency?: string;
  customer_note?: string;
  merchant_note?: string;
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: {
    transaction: PaystackTransaction;
    integration: number;
    deducted_amount: number;
    channel: string | null;
    merchant_note: string;
    customer_note: string;
    status: string;
    refunded_by: string;
    expected_at: string;
    currency: string;
    domain: string;
    amount: number;
    fully_deducted: boolean;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface PaystackCreatePlanParams {
  name: string;
  amount: number; // Amount in kobo
  interval: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'annually';
  description?: string;
  currency?: string;
  invoice_limit?: number;
  send_invoices?: boolean;
  send_sms?: boolean;
}

export interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  description: string;
  amount: number;
  interval: string;
  send_invoices: boolean;
  send_sms: boolean;
  currency: string;
  invoice_limit: number;
  integration: number;
  domain: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackCreateSubscriptionParams {
  customer: string; // Customer email or code
  plan: string; // Plan code
  authorization?: string; // Authorization code
  start_date?: string; // ISO 8601 format
}

export interface PaystackSubscription {
  customer: number;
  plan: number;
  integration: number;
  domain: string;
  start: number;
  status: 'active' | 'non-renewing' | 'cancelled';
  quantity: number;
  amount: number;
  subscription_code: string;
  email_token: string;
  authorization: PaystackAuthorization;
  easy_cron_id: string | null;
  cron_expression: string;
  next_payment_date: string;
  open_invoice: string | null;
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackWebhookEvent {
  event: string;
  data: any;
}

export interface PaystackChargeSuccessEvent extends PaystackWebhookEvent {
  event: 'charge.success';
  data: PaystackTransaction;
}

export interface PaystackTransferSuccessEvent extends PaystackWebhookEvent {
  event: 'transfer.success';
  data: any;
}

export interface PaystackSubscriptionCreateEvent extends PaystackWebhookEvent {
  event: 'subscription.create';
  data: PaystackSubscription;
}

export interface PaystackListTransactionsParams {
  perPage?: number;
  page?: number;
  customer?: number;
  status?: 'success' | 'failed' | 'abandoned';
  from?: string; // ISO 8601 date
  to?: string; // ISO 8601 date
  amount?: number;
}

export interface PaystackListTransactionsResponse {
  status: boolean;
  message: string;
  data: PaystackTransaction[];
  meta: {
    total: number;
    skipped: number;
    perPage: number;
    page: number;
    pageCount: number;
  };
}

export interface PaystackCreateCustomerParams {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  metadata?: Record<string, any>;
}

export interface PaystackCreateCustomerResponse {
  status: boolean;
  message: string;
  data: PaystackCustomer & {
    integration: number;
    domain: string;
    customer_code: string;
    id: number;
    identified: boolean;
    identifications: any;
    createdAt: string;
    updatedAt: string;
  };
}

// Local database types
export interface Payment {
  id: string;
  organization_id: string;
  bot_id?: string;
  conversation_id?: string;

  // Provider details
  provider: 'paystack' | 'payfast' | 'yoco' | 'ozow';
  provider_transaction_id?: string;
  provider_reference: string;

  // Transaction details
  amount: number; // in cents
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  payment_type: 'initialize' | 'charge' | 'subscription';
  payment_method?: string; // card, bank, eft, etc.

  // Customer details
  customer_email?: string;
  customer_phone?: string;

  // Metadata
  description?: string;
  metadata?: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  bot_id?: string;

  // Provider details
  provider: 'paystack' | 'payfast' | 'yoco';
  provider_subscription_id: string;
  provider_customer_code?: string;

  // Plan details
  plan_code: string;
  amount: number;
  currency: string;
  interval: string;

  // Status
  status: 'active' | 'cancelled' | 'expired';

  // Timestamps
  next_payment_date?: string;
  created_at: string;
  cancelled_at?: string;
}

// Utility types
export type PaystackWebhookEventType =
  | 'charge.success'
  | 'charge.failed'
  | 'transfer.success'
  | 'transfer.failed'
  | 'subscription.create'
  | 'subscription.disable'
  | 'subscription.not_renew'
  | 'invoice.create'
  | 'invoice.update'
  | 'invoice.payment_failed';

export interface PaystackErrorResponse {
  status: false;
  message: string;
  errors?: Record<string, string[]>;
}

// Paystack API Response wrapper
export type PaystackApiResponse<T> =
  | (T & { status: true })
  | PaystackErrorResponse;
