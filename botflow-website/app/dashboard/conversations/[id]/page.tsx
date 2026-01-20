'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Message {
    id: string;
    content: string;
    direction: 'inbound' | 'outbound';
    message_type: string;
    status: string;
    sent_by?: string;
    created_at: string;
    metadata?: any;
}

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
    whatsapp_account?: {
        id: string;
        phone_number: string;
        display_name: string;
    };
}

export default function ConversationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const conversationId = params.id as string;

    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadConversation();
        loadMessages();

        // Poll for new messages every 5 seconds
        pollIntervalRef.current = setInterval(() => {
            loadMessages();
        }, 5000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [conversationId]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadConversation = async () => {
        try {
            const response = await api.getConversation(conversationId);
            setConversation(response.conversation);
        } catch (err: any) {
            setError(err.message || 'Failed to load conversation');
        }
    };

    const loadMessages = async () => {
        try {
            const response = await api.getMessages(conversationId);
            setMessages(response.messages || []);
            setLoading(false);
        } catch (err: any) {
            if (loading) {
                setError(err.message || 'Failed to load messages');
                setLoading(false);
            }
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim()) return;

        try {
            setSending(true);
            await api.sendMessage(conversationId, replyContent);
            setReplyContent('');
            await loadMessages();
        } catch (err: any) {
            alert(err.message || 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            setUpdatingStatus(true);
            // TODO: Implement status update API
            alert(`Status update to "${newStatus}" coming soon`);
        } catch (err: any) {
            alert(err.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
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

    const formatTime = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });
        }
    };

    // Group messages by date
    const groupedMessages = messages.reduce((groups: { [key: string]: Message[] }, message) => {
        const date = new Date(message.created_at).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {});

    if (loading) {
        return (
            <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-primary-blue rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading conversation...</p>
                </div>
            </div>
        );
    }

    if (error || !conversation) {
        return (
            <div className="h-[calc(100vh-12rem)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500 mb-4">{error || 'Conversation not found'}</p>
                    <Link
                        href="/dashboard/conversations"
                        className="text-primary-blue hover:underline"
                    >
                        Back to conversations
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-12rem)] flex flex-col">
            {/* Header */}
            <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/conversations"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold text-lg">
                            {getInitials(conversation.customer_name)}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-lg">
                                {conversation.customer_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500">{conversation.customer_phone}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(conversation.status)}`}>
                        {conversation.status === 'needs_handoff' ? 'Needs Handoff' : conversation.status}
                    </span>
                    {conversation.bot && (
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                            Bot: {conversation.bot.name}
                        </span>
                    )}
                    {conversation.status !== 'resolved' && (
                        <>
                            <button
                                onClick={() => handleUpdateStatus('needs_handoff')}
                                disabled={updatingStatus || conversation.status === 'needs_handoff'}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm disabled:opacity-50"
                            >
                                Request Handoff
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('resolved')}
                                disabled={updatingStatus}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium text-sm disabled:opacity-50"
                            >
                                Resolve
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 border-x border-gray-200 p-6">
                {messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No messages in this conversation yet
                    </div>
                ) : (
                    Object.entries(groupedMessages).map(([date, dateMessages]) => (
                        <div key={date}>
                            {/* Date separator */}
                            <div className="flex items-center justify-center my-6">
                                <div className="bg-white px-4 py-1 rounded-full text-sm text-gray-500 shadow-sm">
                                    {formatDate(dateMessages[0].created_at)}
                                </div>
                            </div>

                            {/* Messages for this date */}
                            <div className="space-y-4">
                                {dateMessages.map((msg) => (
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
                                                    {formatTime(msg.created_at)}
                                                </span>
                                                {msg.direction === 'outbound' && (
                                                    <>
                                                        {msg.sent_by === 'bot' && (
                                                            <span className="text-xs opacity-75">Bot</span>
                                                        )}
                                                        {msg.sent_by === 'human' && (
                                                            <span className="text-xs opacity-75">Agent</span>
                                                        )}
                                                        {msg.status === 'sent' && (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                        {msg.status === 'delivered' && (
                                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L4 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                            {msg.metadata?.knowledge_used && (
                                                <div className={`mt-2 text-xs ${
                                                    msg.direction === 'inbound' ? 'text-blue-500' : 'text-white/80'
                                                }`}>
                                                    Used knowledge base
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <form onSubmit={handleSendReply} className="bg-white rounded-b-xl border border-gray-200 border-t-0 p-4">
                <div className="flex gap-3">
                    <input
                        type="text"
                        placeholder="Type a message..."
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        disabled={sending || conversation.status === 'resolved'}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent disabled:bg-gray-100"
                    />
                    <button
                        type="submit"
                        disabled={sending || !replyContent.trim() || conversation.status === 'resolved'}
                        className="px-8 py-3 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Sending
                            </span>
                        ) : 'Send'}
                    </button>
                </div>
                {conversation.status === 'resolved' && (
                    <p className="text-sm text-gray-500 mt-2">
                        This conversation has been resolved. Reopen it to send new messages.
                    </p>
                )}
            </form>
        </div>
    );
}
