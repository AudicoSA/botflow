'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function BotsPage() {
    const [bots, setBots] = useState([
        {
            id: '1',
            name: 'Booking Assistant',
            type: 'booking',
            status: 'active',
            conversations: 234,
            responseTime: '1.2s',
            satisfaction: 96,
        },
        {
            id: '2',
            name: 'FAQ Bot',
            type: 'faq',
            status: 'active',
            conversations: 567,
            responseTime: '0.8s',
            satisfaction: 94,
        },
        {
            id: '3',
            name: 'Order Tracking',
            type: 'order_tracking',
            status: 'inactive',
            conversations: 89,
            responseTime: '1.5s',
            satisfaction: 92,
        },
    ]);

    const botTemplates = [
        {
            type: 'booking',
            name: 'Booking Assistant',
            description: 'Handle appointment and reservation bookings',
            icon: '📅',
            features: ['Date/time selection', 'Capacity management', 'Confirmation messages'],
        },
        {
            type: 'faq',
            name: 'FAQ Bot',
            description: 'Answer frequently asked questions',
            icon: '❓',
            features: ['Knowledge base', 'Smart search', 'Human handoff'],
        },
        {
            type: 'order_tracking',
            name: 'Order Tracking',
            description: 'Track orders and shipments',
            icon: '📦',
            features: ['Order lookup', 'Status updates', 'Delivery notifications'],
        },
        {
            type: 'lead_generation',
            name: 'Lead Generation',
            description: 'Qualify and capture leads',
            icon: '🎯',
            features: ['Lead qualification', 'CRM sync', 'Follow-up automation'],
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Bots</h2>
                    <p className="text-gray-600 mt-1">Manage your AI assistants</p>
                </div>
                <button className="px-4 py-2 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                    + Create Bot
                </button>
            </div>

            {/* Active Bots */}
            <div className="space-y-4">
                {bots.map((bot) => (
                    <div
                        key={bot.id}
                        className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white text-2xl">
                                    {bot.type === 'booking' ? '📅' : bot.type === 'faq' ? '❓' : '📦'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{bot.name}</h3>
                                    <p className="text-sm text-gray-600 capitalize">{bot.type.replace('_', ' ')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-900">{bot.conversations}</p>
                                    <p className="text-xs text-gray-600">Conversations</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-gray-900">{bot.responseTime}</p>
                                    <p className="text-xs text-gray-600">Avg Response</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-600">{bot.satisfaction}%</p>
                                    <p className="text-xs text-gray-600">Satisfaction</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={bot.status === 'active'}
                                            onChange={() => {
                                                setBots(bots.map((b) =>
                                                    b.id === bot.id
                                                        ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' }
                                                        : b
                                                ));
                                            }}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-blue"></div>
                                    </label>
                                    <Link
                                        href={`/dashboard/bots/${bot.id}`}
                                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                                    >
                                        Edit
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bot Templates */}
            <div className="mt-12">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create from Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {botTemplates.map((template) => (
                        <div
                            key={template.type}
                            className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-primary-blue hover:shadow-lg transition-all cursor-pointer"
                        >
                            <div className="text-4xl mb-4">{template.icon}</div>
                            <h4 className="font-bold text-gray-900 mb-2">{template.name}</h4>
                            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                            <ul className="space-y-2 mb-4">
                                {template.features.map((feature, index) => (
                                    <li key={index} className="text-xs text-gray-600 flex items-center gap-2">
                                        <span className="text-green-500">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full py-2 bg-gray-100 hover:bg-primary-blue hover:text-white rounded-lg font-medium transition-all">
                                Use Template
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
