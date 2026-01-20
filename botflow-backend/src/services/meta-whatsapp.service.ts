/**
 * Meta WhatsApp Cloud API Service
 *
 * Handles sending messages via Meta's WhatsApp Cloud API.
 * Used for accounts connected via Embedded Signup.
 *
 * API Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import { logger } from '../config/logger.js';

const META_GRAPH_API_VERSION = 'v18.0';
const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export interface MetaSendMessageParams {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    message: string;
}

export interface MetaSendTemplateParams {
    phoneNumberId: string;
    accessToken: string;
    to: string;
    templateName: string;
    templateLanguage?: string;
    templateComponents?: any[];
}

export interface MetaMessageResponse {
    messaging_product: string;
    contacts: Array<{
        input: string;
        wa_id: string;
    }>;
    messages: Array<{
        id: string;
    }>;
}

export interface MetaWebhookMessage {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'location' | 'contacts' | 'button' | 'interactive';
    text?: {
        body: string;
    };
    image?: {
        id: string;
        mime_type: string;
        sha256: string;
    };
}

export interface MetaWebhookPayload {
    object: 'whatsapp_business_account';
    entry: Array<{
        id: string;
        changes: Array<{
            value: {
                messaging_product: 'whatsapp';
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts?: Array<{
                    profile: {
                        name: string;
                    };
                    wa_id: string;
                }>;
                messages?: MetaWebhookMessage[];
                statuses?: Array<{
                    id: string;
                    status: 'sent' | 'delivered' | 'read' | 'failed';
                    timestamp: string;
                    recipient_id: string;
                    errors?: Array<{
                        code: number;
                        title: string;
                    }>;
                }>;
            };
            field: 'messages';
        }>;
    }>;
}

class MetaWhatsAppService {
    /**
     * Send a text message via Meta Cloud API
     */
    async sendMessage(params: MetaSendMessageParams): Promise<MetaMessageResponse> {
        const { phoneNumberId, accessToken, to, message } = params;

        const url = `${META_GRAPH_API_BASE}/${phoneNumberId}/messages`;

        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.normalizePhoneNumber(to),
            type: 'text',
            text: {
                preview_url: false,
                body: message,
            },
        };

        logger.debug({ phoneNumberId, to: this.maskPhone(to) }, 'Sending Meta WhatsApp message');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                logger.error({ error, phoneNumberId }, 'Meta WhatsApp send failed');
                throw new Error(error.error?.message || 'Failed to send message');
            }

            const result = await response.json() as MetaMessageResponse;
            logger.info({
                messageId: result.messages?.[0]?.id,
                to: this.maskPhone(to),
            }, 'Meta WhatsApp message sent');

            return result;
        } catch (error) {
            logger.error({ error, phoneNumberId }, 'Meta WhatsApp service error');
            throw error;
        }
    }

    /**
     * Send a template message (for initiating conversations outside 24-hour window)
     */
    async sendTemplate(params: MetaSendTemplateParams): Promise<MetaMessageResponse> {
        const { phoneNumberId, accessToken, to, templateName, templateLanguage = 'en', templateComponents = [] } = params;

        const url = `${META_GRAPH_API_BASE}/${phoneNumberId}/messages`;

        const body = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.normalizePhoneNumber(to),
            type: 'template',
            template: {
                name: templateName,
                language: {
                    code: templateLanguage,
                },
                components: templateComponents,
            },
        };

        logger.debug({ phoneNumberId, to: this.maskPhone(to), templateName }, 'Sending Meta WhatsApp template');

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                logger.error({ error, phoneNumberId, templateName }, 'Meta WhatsApp template send failed');
                throw new Error(error.error?.message || 'Failed to send template');
            }

            const result = await response.json() as MetaMessageResponse;
            logger.info({
                messageId: result.messages?.[0]?.id,
                to: this.maskPhone(to),
                templateName,
            }, 'Meta WhatsApp template sent');

            return result;
        } catch (error) {
            logger.error({ error, phoneNumberId, templateName }, 'Meta WhatsApp template service error');
            throw error;
        }
    }

    /**
     * Mark a message as read
     */
    async markAsRead(phoneNumberId: string, accessToken: string, messageId: string): Promise<boolean> {
        const url = `${META_GRAPH_API_BASE}/${phoneNumberId}/messages`;

        const body = {
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId,
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const error = await response.json();
                logger.warn({ error, messageId }, 'Failed to mark message as read');
                return false;
            }

            return true;
        } catch (error) {
            logger.warn({ error, messageId }, 'Error marking message as read');
            return false;
        }
    }

    /**
     * Get business profile for a phone number
     */
    async getBusinessProfile(phoneNumberId: string, accessToken: string): Promise<any> {
        const url = `${META_GRAPH_API_BASE}/${phoneNumberId}/whatsapp_business_profile`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                logger.error({ error, phoneNumberId }, 'Failed to get business profile');
                throw new Error(error.error?.message || 'Failed to get business profile');
            }

            return response.json();
        } catch (error) {
            logger.error({ error, phoneNumberId }, 'Error getting business profile');
            throw error;
        }
    }

    /**
     * Verify webhook signature from Meta
     */
    verifyWebhookSignature(signature: string, payload: string, appSecret: string): boolean {
        // Meta sends X-Hub-Signature-256 header with sha256=<hash>
        if (!signature || !signature.startsWith('sha256=')) {
            return false;
        }

        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', appSecret)
            .update(payload)
            .digest('hex');

        return `sha256=${expectedSignature}` === signature;
    }

    /**
     * Parse incoming webhook payload
     */
    parseWebhookPayload(payload: MetaWebhookPayload): {
        phoneNumberId: string;
        messages: Array<{
            from: string;
            messageId: string;
            timestamp: string;
            type: string;
            content: string;
            contactName?: string;
        }>;
    } | null {
        if (payload.object !== 'whatsapp_business_account') {
            return null;
        }

        const results: any[] = [];

        for (const entry of payload.entry) {
            for (const change of entry.changes) {
                if (change.field !== 'messages') continue;

                const value = change.value;
                const phoneNumberId = value.metadata.phone_number_id;
                const contacts = value.contacts || [];
                const messages = value.messages || [];

                for (const message of messages) {
                    const contact = contacts.find(c => c.wa_id === message.from);
                    let content = '';

                    // Extract content based on message type
                    switch (message.type) {
                        case 'text':
                            content = message.text?.body || '';
                            break;
                        case 'button':
                            content = (message as any).button?.text || '';
                            break;
                        case 'interactive':
                            content = (message as any).interactive?.button_reply?.title ||
                                      (message as any).interactive?.list_reply?.title || '';
                            break;
                        default:
                            content = `[${message.type} message]`;
                    }

                    results.push({
                        phoneNumberId,
                        from: message.from,
                        messageId: message.id,
                        timestamp: message.timestamp,
                        type: message.type,
                        content,
                        contactName: contact?.profile?.name,
                    });
                }
            }
        }

        if (results.length === 0) {
            return null;
        }

        return {
            phoneNumberId: results[0].phoneNumberId,
            messages: results,
        };
    }

    /**
     * Normalize phone number to E.164 format (required by Meta)
     */
    private normalizePhoneNumber(phone: string): string {
        // Remove any non-digit characters except leading +
        let normalized = phone.replace(/[^\d+]/g, '');

        // Remove leading + if present (Meta expects digits only)
        if (normalized.startsWith('+')) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    /**
     * Mask phone number for logging (privacy)
     */
    private maskPhone(phone: string): string {
        if (phone.length <= 6) return '***';
        return phone.substring(0, 3) + '***' + phone.substring(phone.length - 3);
    }
}

export const metaWhatsAppService = new MetaWhatsAppService();
