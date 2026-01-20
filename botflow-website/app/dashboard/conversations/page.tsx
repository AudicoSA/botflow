'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Conversation {
    id: string;
    customer_phone: string;
    customer_name: string;
    status: 'active' | 'resolved' | 'needs_handoff';
    created_at: string;
    updated_at: string;
    bot?: {
        id: string;
        name: string;
    };
    last_message?: {
        content: string;
        direction: 'inbound' | 'outbound';
        created_at: string;
    };
    unread_count?: number;
}

export default function ConversationsPage() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (selectedConversation) {
            loadMessages(selectedConversation);
        }
    }, [selectedConversation]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getConversations();
            setConversations(response.conversations || []);
            // Auto-select first conversation if none selected
            if (!selectedConversation && response.conversations?.length > 0) {
                setSelectedConversation(response.conversations[0].id);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load conversations');
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        try {
            setLoadingMessages(true);
            const response = await api.getMessages(conversationId);
            setMessages(response.messages || []);
        } catch (err: any) {
            console.error('Failed to load messages:', err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedConversation || !replyContent.trim()) return;

        try {
            setSending(true);
            await api.sendMessage(selectedConversation, replyContent);
            setReplyContent('');
            // Reload messages
            await loadMessages(selectedConversation);
        } catch (err: any) {
            alert(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleResolve = async (conversationId: string) => {
        // TODO: Implement resolve API call
        alert('Resolve functionality coming soon');
    };

    const handleTakeOver = async (conversationId: string) => {
        // TODO: Implement take over API call
        alert('Take over functionality coming soon');
    };

    const filteredConversations = conversations.filter(conv => {
        // Filter by status
        if (filter !== 'all' && conv.status !== filter) return false;

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                conv.customer_name?.toLowerCase().includes(query) ||
                conv.customer_phone?.includes(query) ||
                conv.last_message?.content?.toLowerCase().includes(query)
            );
        }
        return true;
    });

    const selectedConv = conversations.find(c => c.id === selectedConversation);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'resolved': return 'bg-gray-100 text-gray-800';
            case 'needs_handoff': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="h-[calc(100vh-12rem)] flex gap-6">
            {/* Conversations List */}
            <div className="w-96 bg-white rounded-xl border border-gray-200 flex flex-col">
                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-200">
                    <input
                        type="search"
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                    />
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {['all', 'active', 'needs_handoff', 'resolved'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                                    filter === status
                                        ? 'bg-primary-blue text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {status === 'needs_handoff' ? 'Handoff' : status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-primary-blue rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading conversations...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 text-center">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button
                                onClick={loadConversations}
                                className="text-primary-blue hover:underline"
                            >
                                Try again
                            </button>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            {searchQuery || filter !== 'all'
                                ? 'No conversations match your search'
                                : 'No conversations yet'}
                        </div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setSelectedConversation(conv.id)}
                                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                                    selectedConversation === conv.id ? 'bg-blue-50' : ''
                                }`}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                            {getInitials(conv.customer_name)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {conv.customer_name || 'Unknown'}
                                            </p>
                                            <p className="text-xs text-gray-500">{conv.customer_phone}</p>
                                        </div>
                                    </div>
                                    {(conv.unread_count || 0) > 0 && (
                                        <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                            {conv.unread_count}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 truncate mb-1">
                                    {conv.last_message?.content || 'No messages yet'}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">
                                        {conv.updated_at ? formatTime(conv.updated_at) : ''}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(conv.status)}`}>
                                            {conv.status === 'needs_handoff' ? 'Handoff' : conv.status}
                                        </span>
                                        {conv.bot && (
                                            <span className="text-xs text-gray-500">
                                                {conv.bot.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col">
                {selectedConv ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                    {getInitials(selectedConv.customer_name)}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {selectedConv.customer_name || 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-500">{selectedConv.customer_phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`text-xs px-2.5 py-1 rounded-full ${getStatusColor(selectedConv.status)}`}>
                                    {selectedConv.status === 'needs_handoff' ? 'Needs Handoff' : selectedConv.status}
                                </span>
                                {selectedConv.status !== 'resolved' && (
                                    <>
                                        <button
                                            onClick={() => handleTakeOver(selectedConv.id)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm"
                                        >
                                            Take Over
                                        </button>
                                        <button
                                            onClick={() => handleResolve(selectedConv.id)}
                                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm"
                                        >
                                            Resolve
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                            {loadingMessages ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-primary-blue rounded-full mx-auto"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No messages in this conversation
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                                    >
                                        <div
                                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                                                msg.direction === 'inbound'
                                                    ? 'bg-white border border-gray-200 rounded-bl-sm'
                                                    : 'bg-primary-blue text-white rounded-br-sm'
                                            }`}
                                        >
                                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                            <div className={`flex items-center gap-2 mt-1 ${
                                                msg.direction === 'inbound' ? 'text-gray-500' : 'text-white/70'
                                            }`}>
                                                <span className="text-xs">
                                                    {new Date(msg.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {msg.direction === 'outbound' && msg.sent_by === 'bot' && (
                                                    <span className="text-xs opacity-75">Bot</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSendReply} className="p-4 border-t border-gray-200">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    disabled={sending}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:bg-gray-100"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !replyContent.trim()}
                                    className="px-6 py-3 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sending ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <p>Select a conversation to view messages</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
