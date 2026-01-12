'use client';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const stats = [
        { label: 'Total Conversations', value: '1,234', change: '+12%', icon: '💬' },
        { label: 'Active Bots', value: '3', change: '+1', icon: '🤖' },
        { label: 'Avg Response Time', value: '1.8s', change: '-0.3s', icon: '⚡' },
        { label: 'Resolution Rate', value: '94%', change: '+2%', icon: '✅' },
    ];

    const recentConversations = [
        { customer: '+27 82 123 4567', message: 'Hi, I need to book a shuttle', time: '2 min ago', status: 'active' },
        { customer: '+27 81 987 6543', message: 'What time do you close?', time: '15 min ago', status: 'resolved' },
        { customer: '+27 83 456 7890', message: 'Can I change my booking?', time: '1 hour ago', status: 'active' },
    ];

    return (
        <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-3xl">{stat.icon}</span>
                            <span className="text-sm font-medium text-green-600">{stat.change}</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => router.push('/dashboard/templates')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-all"
                    >
                        <span className="text-2xl">🤖</span>
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Create Bot</p>
                            <p className="text-sm text-gray-600">Set up a new AI assistant</p>
                        </div>
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/integrations')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-all"
                    >
                        <span className="text-2xl">📱</span>
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Connect WhatsApp</p>
                            <p className="text-sm text-gray-600">Add a phone number</p>
                        </div>
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/marketplace')}
                        className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary-blue hover:bg-blue-50 transition-all"
                    >
                        <span className="text-2xl">🔌</span>
                        <div className="text-left">
                            <p className="font-semibold text-gray-900">Add Integration</p>
                            <p className="text-sm text-gray-600">Connect your tools</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Recent Conversations */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Recent Conversations</h2>
                    <button
                        onClick={() => router.push('/dashboard/conversations')}
                        className="text-primary-blue hover:underline text-sm font-medium"
                    >
                        View all →
                    </button>
                </div>
                <div className="space-y-3">
                    {recentConversations.map((conv, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                    {conv.customer.slice(-4)}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{conv.customer}</p>
                                    <p className="text-sm text-gray-600">{conv.message}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500">{conv.time}</p>
                                <span className={`inline-block px-2 py-1 text-xs rounded-full ${conv.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {conv.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
