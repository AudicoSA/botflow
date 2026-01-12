// API client for BotFlow backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
    private token: string | null = null;

    constructor() {
        if (typeof window !== 'undefined') {
            this.token = localStorage.getItem('botflow_token');
        }
    }

    setToken(token: string) {
        this.token = token;
        if (typeof window !== 'undefined') {
            localStorage.setItem('botflow_token', token);
        }
    }

    clearToken() {
        this.token = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('botflow_token');
        }
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        // Merge existing headers if any
        if (options.headers) {
            Object.entries(options.headers as Record<string, string>).forEach(([key, value]) => {
                headers[key] = value;
            });
        }

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    // Auth
    async signup(data: { email: string; password: string; fullName: string; organizationName: string }) {
        const result = await this.request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(result.token);
        return result;
    }

    async login(data: { email: string; password: string }) {
        const result = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        this.setToken(result.token);

        // Store organization and whatsapp account info if available
        if (typeof window !== 'undefined') {
            if (result.organization?.id) {
                localStorage.setItem('botflow_organizationId', result.organization.id);
            }
            if (result.whatsappAccount?.id) {
                localStorage.setItem('botflow_whatsappAccountId', result.whatsappAccount.id);
            }
        }

        return result;
    }

    async getMe() {
        return this.request('/api/auth/me');
    }

    // Bots
    async getBots() {
        return this.request('/api/bots');
    }

    async getBot(id: string) {
        return this.request(`/api/bots/${id}`);
    }

    async createBot(data: any) {
        return this.request('/api/bots', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateBot(id: string, data: any) {
        return this.request(`/api/bots/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteBot(id: string) {
        return this.request(`/api/bots/${id}`, {
            method: 'DELETE',
        });
    }

    // Conversations
    async getConversations() {
        return this.request('/api/conversations');
    }

    async getConversation(id: string) {
        return this.request(`/api/conversations/${id}`);
    }

    async getMessages(conversationId: string) {
        return this.request(`/api/conversations/${conversationId}/messages`);
    }

    async sendMessage(conversationId: string, content: string) {
        return this.request(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    // WhatsApp
    async getWhatsAppAccounts() {
        return this.request('/api/whatsapp/accounts');
    }

    async connectWhatsApp(data: any) {
        return this.request('/api/whatsapp/connect', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Organization
    async getOrganization(id: string) {
        return this.request(`/api/organizations/${id}`);
    }

    async updateOrganization(id: string, data: any) {
        return this.request(`/api/organizations/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }
}

export const api = new ApiClient();
