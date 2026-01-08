/**
 * Workflow Generator
 * Converts BotFlow template configurations into n8n workflow JSON
 */

import { N8nClient, N8nWorkflow, N8nNode } from './n8n-client.js';
import { FastifyBaseLogger } from 'fastify';

export interface TemplateConfig {
    templateId: string;
    userId: string;
    botId: string;
    config: Record<string, any>;
}

export interface GeneratedWorkflow {
    workflowId: string;
    webhookPath: string;
    webhookUrl: string;
}

export class WorkflowGenerator {
    private n8nClient: N8nClient;
    private logger: FastifyBaseLogger;
    private webhookBaseUrl: string;

    constructor(config: { n8nClient: N8nClient; logger: FastifyBaseLogger; webhookBaseUrl: string }) {
        this.n8nClient = config.n8nClient;
        this.logger = config.logger;
        this.webhookBaseUrl = config.webhookBaseUrl;
    }

    /**
     * Generate and deploy a workflow from a template
     */
    async generateFromTemplate(templateConfig: TemplateConfig): Promise<GeneratedWorkflow> {
        const { templateId, userId, botId, config } = templateConfig;

        this.logger.info({ templateId, userId, botId }, 'Generating workflow from template');

        let workflow: N8nWorkflow;

        switch (templateId) {
            case 'booking_bot':
                workflow = this.generateBookingBotWorkflow(userId, botId, config);
                break;
            case 'transport_bot':
                workflow = this.generateTransportBotWorkflow(userId, botId, config);
                break;
            case 'restaurant_bot':
                workflow = this.generateRestaurantBotWorkflow(userId, botId, config);
                break;
            case 'lead_gen_bot':
                workflow = this.generateLeadGenBotWorkflow(userId, botId, config);
                break;
            case 'ecommerce_bot':
                workflow = this.generateEcommerceBotWorkflow(userId, botId, config);
                break;
            case 'support_bot':
                workflow = this.generateSupportBotWorkflow(userId, botId, config);
                break;
            case 'survey_bot':
                workflow = this.generateSurveyBotWorkflow(userId, botId, config);
                break;
            default:
                throw new Error(`Unknown template: ${templateId}`);
        }

        // Create workflow in n8n
        const createdWorkflow = await this.n8nClient.createWorkflow(workflow);

        // Activate the workflow
        await this.n8nClient.activateWorkflow(createdWorkflow.id!);

        const webhookPath = `bot-${botId}`;
        const webhookUrl = `${this.webhookBaseUrl}/${webhookPath}`;

        return {
            workflowId: createdWorkflow.id!,
            webhookPath,
            webhookUrl,
        };
    }

    /**
     * Generate Booking Bot workflow
     */
    private generateBookingBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        const webhookPath = `bot-${botId}`;

        const nodes: N8nNode[] = [
            // 1. Webhook trigger
            {
                id: 'webhook-trigger',
                name: 'WhatsApp Message',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    path: webhookPath,
                    responseMode: 'responseNode',
                    options: {},
                },
            },

            // 2. Parse message intent
            {
                id: 'parse-message',
                name: 'Parse Booking Request',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    language: 'javaScript',
                    jsCode: `
// Extract booking details from WhatsApp message
const message = $input.item.json.message || '';
const services = ${JSON.stringify(config.services || [])};

// Simple intent detection
let service = null;
for (const s of services) {
  if (message.toLowerCase().includes(s.toLowerCase())) {
    service = s;
    break;
  }
}

// Extract date/time (simplified - would use NLP in production)
const dateMatch = message.match(/\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}/);
const timeMatch = message.match(/\\d{1,2}:\\d{2}/);

return {
  json: {
    service: service || 'General Appointment',
    requestedDate: dateMatch ? dateMatch[0] : null,
    requestedTime: timeMatch ? timeMatch[0] : null,
    customerMessage: message,
    from: $input.item.json.from,
    timestamp: new Date().toISOString(),
  }
};
          `,
                },
            },

            // 3. Check calendar availability (if Google Calendar configured)
            ...(config.calendar_provider === 'Google Calendar'
                ? [
                    {
                        id: 'check-calendar',
                        name: 'Check Availability',
                        type: 'n8n-nodes-base.googleCalendar',
                        typeVersion: 1,
                        position: [650, 300],
                        parameters: {
                            operation: 'getAll',
                            calendar: 'primary',
                            returnAll: false,
                            limit: 10,
                            options: {
                                timeMin: '={{ $json.requestedDate || new Date().toISOString() }}',
                                timeMax: '={{ new Date(Date.now() + 7*24*60*60*1000).toISOString() }}',
                            },
                        },
                        credentials: {
                            googleCalendarOAuth2Api: `google-calendar-${userId}`,
                        },
                    } as N8nNode,
                ]
                : []),

            // 4. Create booking
            ...(config.calendar_provider === 'Google Calendar'
                ? [
                    {
                        id: 'create-booking',
                        name: 'Create Calendar Event',
                        type: 'n8n-nodes-base.googleCalendar',
                        typeVersion: 1,
                        position: [850, 300],
                        parameters: {
                            operation: 'create',
                            calendar: 'primary',
                            summary: '={{ $json.service }}',
                            description: '={{ $json.customerMessage }}',
                            start: '={{ $json.requestedDate || new Date().toISOString() }}',
                            end: '={{ new Date(Date.parse($json.requestedDate || new Date()) + ${config.duration_minutes || 30}*60*1000).toISOString() }}',
                        },
                        credentials: {
                            googleCalendarOAuth2Api: `google-calendar-${userId}`,
                        },
                    } as N8nNode,
                ]
                : []),

            // 5. Send confirmation
            {
                id: 'send-confirmation',
                name: 'Send Confirmation',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [1050, 300],
                parameters: {
                    respondWith: 'json',
                    responseBody: `={
  "success": true,
  "message": "✅ Booking confirmed!\\n\\nService: " + $json.service + "\\nDate: " + ($json.requestedDate || "To be confirmed") + "\\nTime: " + ($json.requestedTime || "To be confirmed") + "\\n\\nWe'll send you a reminder 24 hours before your appointment.",
  "data": $json
}`,
                },
            },
        ];

        // Create connections
        const connections: Record<string, any> = {
            'webhook-trigger': {
                main: [[{ node: 'parse-message', type: 'main', index: 0 }]],
            },
        };

        if (config.calendar_provider === 'Google Calendar') {
            connections['parse-message'] = {
                main: [[{ node: 'check-calendar', type: 'main', index: 0 }]],
            };
            connections['check-calendar'] = {
                main: [[{ node: 'create-booking', type: 'main', index: 0 }]],
            };
            connections['create-booking'] = {
                main: [[{ node: 'send-confirmation', type: 'main', index: 0 }]],
            };
        } else {
            connections['parse-message'] = {
                main: [[{ node: 'send-confirmation', type: 'main', index: 0 }]],
            };
        }

        return {
            name: `Booking Bot - ${botId}`,
            nodes,
            connections,
            active: false,
            settings: {
                executionOrder: 'v1',
            },
        };
    }

    /**
     * Generate Lead Generation Bot workflow
     */
    private generateLeadGenBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        const webhookPath = `bot-${botId}`;

        const nodes: N8nNode[] = [
            {
                id: 'webhook-trigger',
                name: 'WhatsApp Message',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    path: webhookPath,
                    responseMode: 'responseNode',
                },
            },
            {
                id: 'qualify-lead',
                name: 'Qualify Lead',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    language: 'javaScript',
                    jsCode: `
const message = $input.item.json.message || '';
const qualifyingQuestions = ${JSON.stringify(config.qualifying_questions || [])};

// Simple lead qualification logic
return {
  json: {
    leadData: {
      message: message,
      from: $input.item.json.from,
      timestamp: new Date().toISOString(),
      qualified: message.length > 10, // Simple qualification
    }
  }
};
          `,
                },
            },
            {
                id: 'send-response',
                name: 'Send Response',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [650, 300],
                parameters: {
                    respondWith: 'json',
                    responseBody: '={ "success": true, "message": "Thank you for your interest! We\'ll be in touch soon." }',
                },
            },
        ];

        const connections = {
            'webhook-trigger': {
                main: [[{ node: 'qualify-lead', type: 'main', index: 0 }]],
            },
            'qualify-lead': {
                main: [[{ node: 'send-response', type: 'main', index: 0 }]],
            },
        };

        return {
            name: `Lead Gen Bot - ${botId}`,
            nodes,
            connections,
            active: false,
            settings: {
                executionOrder: 'v1',
            },
        };
    }

    /**
     * Generate E-commerce Bot workflow
     */
    private generateEcommerceBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        // Simplified version - would integrate with Shopify/WooCommerce in production
        return this.generateLeadGenBotWorkflow(userId, botId, config);
    }

    /**
     * Generate Support Bot workflow
     */
    private generateSupportBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        // Simplified version - would integrate with OpenAI in production
        return this.generateLeadGenBotWorkflow(userId, botId, config);
    }

    /**
     * Generate Survey Bot workflow
     */
    private generateSurveyBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        // Simplified version - would integrate with Google Sheets in production
        return this.generateLeadGenBotWorkflow(userId, botId, config);
    }

    /**
     * Generate Transport/Taxi Bot workflow
     */
    private generateTransportBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        const webhookPath = `bot-${botId}`;

        const nodes: N8nNode[] = [
            {
                id: 'webhook-trigger',
                name: 'WhatsApp Message',
                type: 'n8n-nodes-base.webhook',
                typeVersion: 1,
                position: [250, 300],
                parameters: {
                    path: webhookPath,
                    responseMode: 'responseNode',
                },
            },
            {
                id: 'parse-booking',
                name: 'Parse Trip Request',
                type: 'n8n-nodes-base.code',
                typeVersion: 2,
                position: [450, 300],
                parameters: {
                    language: 'javaScript',
                    jsCode: `
const message = $input.item.json.message || '';
const routes = ${JSON.stringify(config.routes || [])};

// Extract pickup and destination
let route = null;
for (const r of routes) {
  if (message.toLowerCase().includes(r.from.toLowerCase()) && 
      message.toLowerCase().includes(r.to.toLowerCase())) {
    route = r;
    break;
  }
}

return {
  json: {
    from: route?.from || 'Unknown',
    to: route?.to || 'Unknown',
    price: route?.price || 'TBD',
    customerMessage: message,
    phoneNumber: $input.item.json.from,
    timestamp: new Date().toISOString(),
  }
};
          `,
                },
            },
            {
                id: 'send-quote',
                name: 'Send Quote',
                type: 'n8n-nodes-base.respondToWebhook',
                typeVersion: 1,
                position: [650, 300],
                parameters: {
                    respondWith: 'json',
                    responseBody: `={
  "success": true,
  "message": "🚖 Trip Quote\\n\\nFrom: " + $json.from + "\\nTo: " + $json.to + "\\nPrice: R" + $json.price + "\\n\\nReply 'CONFIRM' to book this trip!",
  "data": $json
}`,
                },
            },
        ];

        const connections = {
            'webhook-trigger': {
                main: [[{ node: 'parse-booking', type: 'main', index: 0 }]],
            },
            'parse-booking': {
                main: [[{ node: 'send-quote', type: 'main', index: 0 }]],
            },
        };

        return {
            name: `Transport Bot - ${botId}`,
            nodes,
            connections,
            active: false,
            settings: {
                executionOrder: 'v1',
            },
        };
    }

    /**
     * Generate Restaurant Bot workflow
     */
    private generateRestaurantBotWorkflow(userId: string, botId: string, config: any): N8nWorkflow {
        // Similar to transport bot but for restaurant orders
        return this.generateTransportBotWorkflow(userId, botId, config);
    }
}

