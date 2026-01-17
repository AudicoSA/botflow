'use client';

import { formatDistanceToNow } from 'date-fns';

interface MessageData {
  id: string;
  customer_phone: string;
  message: string;
  bot_response?: string;
  timestamp: string;
  status: 'active' | 'resolved' | 'escalated';
}

interface Message {
  type: string;
  data: MessageData;
}

interface ConversationFeedProps {
  messages: Message[];
}

export function ConversationFeed({ messages }: ConversationFeedProps) {
  const conversationMessages = messages.filter(m => m.type === 'new_message');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'resolved': return 'bg-blue-100 text-blue-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'resolved': return '✅';
      case 'escalated': return '🔴';
      default: return '⚪';
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format South African phone numbers: +27 XX XXX XXXX
    if (phone.startsWith('+27') && phone.length === 12) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    }
    return phone;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">💬 Recent Conversations</h2>
        <p className="text-sm text-gray-600 mt-1">Live feed of customer interactions</p>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {conversationMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="font-medium">No recent conversations</p>
            <p className="text-sm mt-1">Waiting for customer messages...</p>
          </div>
        ) : (
          conversationMessages.slice(-10).reverse().map((msg) => (
            <div key={msg.data.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">{getStatusIcon(msg.data.status)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {formatPhoneNumber(msg.data.customer_phone)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(msg.data.status)}`}>
                      {msg.data.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Customer:</span> {msg.data.message}
                    </p>
                    {msg.data.bot_response && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Bot:</span> {msg.data.bot_response}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(new Date(msg.data.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
