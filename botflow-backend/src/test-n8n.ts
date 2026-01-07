/**
 * Test n8n Connection
 * Quick script to verify n8n Cloud integration is working
 */

import { N8nClient } from './services/n8n-client.js';
import pino from 'pino';

const logger = pino({
    transport: {
        target: 'pino-pretty',
    },
});

async function testN8nConnection() {
    console.log('🧪 Testing n8n Cloud connection...\n');

    const n8nClient = new N8nClient({
        baseUrl: process.env.N8N_API_URL || 'https://botflowsa.app.n8n.cloud/api/v1',
        apiKey: process.env.N8N_API_KEY || '',
        logger: logger as any,
    });

    try {
        // Test connection
        const isConnected = await n8nClient.testConnection();

        if (isConnected) {
            console.log('✅ n8n connection successful!');
            console.log('📍 URL:', process.env.N8N_API_URL);
            console.log('🔑 API Key configured:', process.env.N8N_API_KEY ? 'Yes' : 'No');
            console.log('\n✨ Ready to create workflows!\n');
            process.exit(0);
        } else {
            console.log('❌ n8n connection failed');
            console.log('Please check your credentials in .env file\n');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error testing n8n connection:', error);
        process.exit(1);
    }
}

testN8nConnection();
