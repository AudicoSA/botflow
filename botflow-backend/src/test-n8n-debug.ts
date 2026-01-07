/**
 * Test n8n Connection - Debug Version
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Checking n8n configuration...\n');
console.log('N8N_API_URL:', process.env.N8N_API_URL);
console.log('N8N_API_KEY:', process.env.N8N_API_KEY ? `${process.env.N8N_API_KEY.substring(0, 20)}...` : 'NOT SET');
console.log('N8N_WEBHOOK_URL:', process.env.N8N_WEBHOOK_URL);
console.log('\n🧪 Testing connection...\n');

const testUrl = process.env.N8N_API_URL || 'https://botflowsa.app.n8n.cloud/api/v1';
const testKey = process.env.N8N_API_KEY || '';

async function test() {
    try {
        console.log(`Fetching: ${testUrl}/workflows`);

        const response = await fetch(`${testUrl}/workflows`, {
            headers: {
                'X-N8N-API-KEY': testKey,
            },
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.ok) {
            const data = await response.json();
            console.log('\n✅ Connection successful!');
            console.log('Workflows found:', data.data?.length || 0);
        } else {
            const errorText = await response.text();
            console.log('\n❌ Connection failed');
            console.log('Error:', errorText);
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

test();
