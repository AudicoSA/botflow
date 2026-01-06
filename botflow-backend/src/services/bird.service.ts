import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const BIRD_API_BASE = 'https://api.bird.com';

interface SendMessageParams {
    to: string;
    content: {
        text?: string;
        image?: {
            url: string;
            caption?: string;
        };
    };
    channelId: string;
}

interface BirdMessageResponse {
    id: string;
    status: string;
}

class BirdService {
    private apiKey: string;
    private workspaceId: string;

    constructor() {
        this.apiKey = env.BIRD_API_KEY;
        this.workspaceId = env.BIRD_WORKSPACE_ID;
    }

    /**
     * Send a WhatsApp message via Bird
     */
    async sendMessage(params: SendMessageParams): Promise<BirdMessageResponse> {
        try {
            const payload = {
                receiver: {
                    contacts: [
                        {
                            identifierValue: params.to,
                        },
                    ],
                },
                body: params.content.text
                    ? {
                        type: 'text',
                        text: {
                            text: params.content.text,
                        },
                    }
                    : {
                        type: 'media',
                        media: {
                            url: params.content.image?.url,
                            caption: params.content.image?.caption,
                        },
                    },
            };

            const response = await fetch(
                `${BIRD_API_BASE}/workspaces/${this.workspaceId}/channels/${params.channelId}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `AccessKey ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                logger.error({ error, status: response.status }, 'Bird API error');
                throw new Error(`Bird API error: ${response.status}`);
            }

            const data: any = await response.json();
            logger.info({ messageId: data.id }, 'Message sent via Bird');

            return data as BirdMessageResponse;
        } catch (error) {
            logger.error({ error }, 'Failed to send message via Bird');
            throw error;
        }
    }

    /**
     * Get channel information
     */
    async getChannel(channelId: string) {
        try {
            const response = await fetch(
                `${BIRD_API_BASE}/workspaces/${this.workspaceId}/channels/${channelId}`,
                {
                    headers: {
                        'Authorization': `AccessKey ${this.apiKey}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to get channel: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            logger.error({ error, channelId }, 'Failed to get channel');
            throw error;
        }
    }

    /**
     * Verify webhook signature (if Bird provides one)
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
        // Bird webhook verification logic
        // This depends on Bird's specific implementation
        // For now, return true if no secret is configured
        if (!secret) return true;

        // TODO: Implement actual signature verification
        return true;
    }
}

export const birdService = new BirdService();
