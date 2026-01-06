'use client';

import { useState } from 'react';

export default function ConversationsPage() {
    const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
    const [filter, setFilter] = useState('all');

    const conversations = [
        {
            id: '1',
            customer: { name: 'John Doe', phone: '+27 82 123 4567' },
            lastMessage: 'Thanks! See you tomorrow at 9am',
            time: '2 min ago',
            status: 'active',
            unread: 0,
            bot: 'Booking Assistant',
        },
        {
            id: '2',
            customer: { name: 'Sarah Smith', phone: '+27 81 987 6543' },
            lastMessage: 'What time do you close?',
            time: '15 min ago',
            status: 'resolved',
            unread: 0,
            bot: 'FAQ Bot',
        },
        {
            id: '3',
            customer: { name: 'Mike Johnson', phone: '+27 83 456 7890' },
            lastMessage: 'Can I change my booking to next week?',
            time: '1 hour ago',
            status: 'active',
            unread: 2,
            bot: 'Booking Assistant',
        },
    ];

    const messages = [
        { id: '1', sender: 'customer', content: 'Hi! I need to book a shuttle for tomorrow at 9am', time: '10:30 AM' },
        { id: '2', sender: 'bot', content: 'Perfect! I can help you with that. How many passengers?', time: '10:30 AM' },
        { id: '3', sender: 'customer', content: 'Just 2 people', time: '10:31 AM' },
        { id: '4', sender: 'bot', content: "Great! What's the pickup location?", time: '10:31 AM' },
        { id: '5', sender: 'customer', content: 'St Francis Bay Hotel', time: '10:32 AM' },
        { id: '6', sender: 'bot', content: 'Perfect! Your shuttle is confirmed for tomorrow at 9:00 AM. 2 passengers from St Francis Bay Hotel. 🚐', time: '10:32 AM' },
        { id: '7', sender: 'customer', content: 'Thanks! See you tomorrow at 9am', time: '10:33 AM' },
    ];

    const filteredConversations = filter === 'all'
        ? conversations
        : conversations.filter((c) => c.status === filter);

    return (
        <div className="h-[calc(100vh-12rem)] flex gap-6">
            {/* Conversations List */}
            <div className="w-96 bg-white rounded-xl border border-gray-200 flex flex-col">
                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-200">
                    <input
                        type="search"
                        placeholder="Search conversations..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                    <div className="flex gap-2 mt-3">
                        {['all', 'active', 'resolved', 'handed_off'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${filter === status
                                        ? 'bg-primary-blue text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map((conv) => (
                        <div
                            key={conv.id}
                            onClick={() => setSelectedConversation(conv.id)}
                            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${selectedConversation === conv.id ? 'bg-blue-50' : ''
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                        {conv.customer.name.split(' ').map((n) => n[0]).join('')}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{conv.customer.name}</p>
                                        <p className="text-xs text-gray-500">{conv.customer.phone}</p>
                                    </div>
                                </div>
                                {conv.unread > 0 && (
                                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                        {conv.unread}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 truncate mb-1">{conv.lastMessage}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{conv.time}</span>
                                <span className="text-xs text-gray-500">🤖 {conv.bot}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
                {selectedConversation ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                    JD
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">John Doe</p>
                                    <p className="text-xs text-gray-500">+27 82 123 4567</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
                                    Take Over
                                </button>
                                <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm">
                                    Resolve
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'customer' ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div
                                        className={`max-w-[70%] rounded-2xl px-4 py-3 ${msg.sender === 'customer'
                                                ? 'bg-white border border-gray-200 rounded-bl-sm'
                                                : 'bg-primary-blue text-white rounded-br-sm'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                        <p className={`text-xs mt-1 ${msg.sender === 'customer' ? 'text-gray-500' : 'text-white/70'}`}>
                                            {msg.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                />
                                <button className="px-6 py-3 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        Select a conversation to view messages
                    </div>
                )}
            </div>
        </div>
    );
}
