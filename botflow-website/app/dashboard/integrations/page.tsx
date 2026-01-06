'use client';

import { useState } from 'react';

export default function IntegrationsPage() {
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', name: 'All', icon: '🔌' },
        { id: 'crm', name: 'CRM', icon: '👥' },
        { id: 'calendar', name: 'Calendar', icon: '📅' },
        { id: 'ecommerce', name: 'E-commerce', icon: '🛒' },
        { id: 'payment', name: 'Payments', icon: '💳' },
        { id: 'analytics', name: 'Analytics', icon: '📊' },
    ];

    const integrations = [
        {
            id: 'salesforce',
            name: 'Salesforce',
            category: 'crm',
            description: 'Sync contacts and leads automatically',
            icon: '☁️',
            connected: false,
            popular: true,
        },
        {
            id: 'hubspot',
            name: 'HubSpot',
            category: 'crm',
            description: 'Manage customer relationships seamlessly',
            icon: '🟠',
            connected: true,
            popular: true,
        },
        {
            id: 'google-calendar',
            name: 'Google Calendar',
            category: 'calendar',
            description: 'Schedule appointments directly from WhatsApp',
            icon: '📅',
            connected: false,
            popular: true,
        },
        {
            id: 'calendly',
            name: 'Calendly',
            category: 'calendar',
            description: 'Automated booking and scheduling',
            icon: '🗓️',
            connected: false,
            popular: false,
        },
        {
            id: 'shopify',
            name: 'Shopify',
            category: 'ecommerce',
            description: 'Track orders and manage inventory',
            icon: '🛍️',
            connected: false,
            popular: true,
        },
        {
            id: 'woocommerce',
            name: 'WooCommerce',
            category: 'ecommerce',
            description: 'WordPress e-commerce integration',
            icon: '🛒',
            connected: false,
            popular: false,
        },
        {
            id: 'stripe',
            name: 'Stripe',
            category: 'payment',
            description: 'Accept payments via WhatsApp',
            icon: '💳',
            connected: false,
            popular: true,
        },
        {
            id: 'payfast',
            name: 'PayFast',
            category: 'payment',
            description: 'South African payment gateway',
            icon: '💰',
            connected: false,
            popular: false,
        },
        {
            id: 'google-analytics',
            name: 'Google Analytics',
            category: 'analytics',
            description: 'Track conversation analytics',
            icon: '📈',
            connected: false,
            popular: false,
        },
    ];

    const filteredIntegrations = activeCategory === 'all'
        ? integrations
        : integrations.filter((i) => i.category === activeCategory);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
                    <p className="text-gray-600 mt-1">Connect BotFlow with your favorite tools</p>
                </div>
                <button className="px-4 py-2 bg-primary-blue text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                    Request Integration
                </button>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        onClick={() => setActiveCategory(category.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${activeCategory === category.id
                                ? 'bg-primary-blue text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-blue'
                            }`}
                    >
                        <span>{category.icon}</span>
                        <span>{category.name}</span>
                    </button>
                ))}
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIntegrations.map((integration) => (
                    <div
                        key={integration.id}
                        className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                                    {integration.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{integration.name}</h3>
                                    {integration.popular && (
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                            Popular
                                        </span>
                                    )}
                                </div>
                            </div>
                            {integration.connected && (
                                <span className="text-green-500 text-sm font-medium">✓ Connected</span>
                            )}
                        </div>

                        <p className="text-gray-600 text-sm mb-4">{integration.description}</p>

                        <button
                            className={`w-full py-2 rounded-lg font-semibold transition-all ${integration.connected
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-primary-blue text-white hover:shadow-lg'
                                }`}
                        >
                            {integration.connected ? 'Manage' : 'Connect'}
                        </button>
                    </div>
                ))}
            </div>

            {/* Custom Integration CTA */}
            <div className="bg-gradient-to-br from-primary-blue to-primary-cyan rounded-xl p-8 text-white">
                <div className="max-w-2xl">
                    <h3 className="text-2xl font-bold mb-2">Need a custom integration?</h3>
                    <p className="text-white/90 mb-4">
                        We can build custom integrations for your specific business needs. Contact our team to discuss your requirements.
                    </p>
                    <button className="px-6 py-3 bg-white text-primary-blue rounded-lg font-semibold hover:shadow-lg transition-all">
                        Contact Sales
                    </button>
                </div>
            </div>
        </div>
    );
}
