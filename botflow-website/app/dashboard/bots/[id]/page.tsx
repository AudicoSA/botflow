'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BotEditorPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const botId = params.id as string;
    const justCreated = searchParams.get('created') === 'true';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [bot, setBot] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('general');
    const [showSuccess, setShowSuccess] = useState(justCreated);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        welcomeMessage: '',
        fallbackMessage: '',
        systemPrompt: '',
        modelConfig: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7
        }
    });

    useEffect(() => {
        const fetchBot = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const token = localStorage.getItem('botflow_token');

                if (!token) {
                    alert('Please login to continue');
                    router.push('/login');
                    return;
                }

                const response = await fetch(`${apiUrl}/api/bots/${botId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setBot(data.bot);
                    const botData = data.bot;
                    setFormData({
                        name: botData.name || '',
                        description: botData.description || '',
                        welcomeMessage: botData.config?.welcomeMessage || '',
                        fallbackMessage: botData.config?.fallbackMessage || '',
                        systemPrompt: botData.system_prompt || '',
                        modelConfig: botData.model_config || {
                            provider: 'openai',
                            model: 'gpt-4o',
                            temperature: 0.7
                        }
                    });
                } else {
                    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
                    alert(`Failed to load bot details: ${error.message || 'Unknown error'}`);
                    router.push('/dashboard/bots');
                }
            } catch (error) {
                console.error('Error fetching bot:', error);
                alert('An error occurred loading the bot');
                router.push('/dashboard/bots');
            } finally {
                setLoading(false);
            }
        };

        if (botId) {
            fetchBot();
        }
    }, [botId, router]);

    useEffect(() => {
        if (justCreated) {
            // Auto-hide success message after 10 seconds
            const timer = setTimeout(() => setShowSuccess(false), 10000);
            return () => clearTimeout(timer);
        }
    }, [justCreated]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const token = localStorage.getItem('botflow_token');

            if (!token) {
                alert('Please login to continue');
                router.push('/login');
                return;
            }

            const payload = {
                name: formData.name,
                description: formData.description,
                systemPrompt: formData.systemPrompt,
                modelConfig: formData.modelConfig,
                config: {
                    ...(bot?.config || {}),
                    name: formData.name,
                    description: formData.description,
                    welcomeMessage: formData.welcomeMessage,
                    fallbackMessage: formData.fallbackMessage,
                }
            };

            const response = await fetch(`${apiUrl}/api/bots/${botId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                alert('Bot updated successfully!');
                router.refresh();
            } else {
                const error = await response.json();
                alert(`Failed to update bot: ${error.message || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating bot:', error);
            alert('Failed to update bot. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
            </div>
        );
    }

    if (!bot) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Success Message */}
            {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-fade-in">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">🎉</div>
                        <div className="flex-1">
                            <h2 className="text-green-900 font-bold text-lg mb-1">
                                Bot Created Successfully!
                            </h2>
                            <p className="text-green-800 text-sm mb-3">
                                Your bot is now active and ready to receive messages from customers.
                            </p>
                            <div className="flex gap-3">
                                <Link href={`/dashboard/conversations`} className="text-sm text-green-700 underline hover:text-green-900">
                                    View conversations →
                                </Link>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSuccess(false)}
                            className="text-green-600 hover:text-green-800 text-xl"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Edit Bot</h2>
                    <p className="text-gray-600 mt-1">Configure {bot.name}</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/dashboard/bots"
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                    >
                        Cancel
                    </Link>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {['general', 'brain', 'knowledge'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`
                                py-4 px-1 border-b-2 font-medium text-sm capitalize
                                ${activeTab === tab
                                    ? 'border-primary-blue text-primary-blue'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            {tab === 'brain' ? 'Brain & Intelligence' : tab === 'knowledge' ? 'Knowledge Base' : 'General Settings'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">General Settings</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bot Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Conversation Flow</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
                                        <p className="text-xs text-gray-500 mb-2">The first message sent when a user starts a chat.</p>
                                        <textarea
                                            value={formData.welcomeMessage}
                                            onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                            rows={3}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Fallback Message</label>
                                        <p className="text-xs text-gray-500 mb-2">Sent when the bot doesn't understand the user's input.</p>
                                        <textarea
                                            value={formData.fallbackMessage}
                                            onChange={(e) => setFormData({ ...formData, fallbackMessage: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                                <h3 className="font-bold text-gray-900 mb-4">Bot Status</h3>
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-gray-600">Status</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${bot.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {bot.status === 'active' ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                    Created: {new Date(bot.createdAt || Date.now()).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'brain' && (
                    <BrainTab
                        systemPrompt={formData.systemPrompt}
                        modelConfig={formData.modelConfig}
                        onChange={(data) => setFormData({ ...formData, ...data })}
                    />
                )}

                {activeTab === 'knowledge' && (
                    <KnowledgeBaseTab botId={botId} />
                )}
            </div>
        </div>
    );
}

import BrainTab from './BrainTab';
import KnowledgeBaseTab from './KnowledgeBaseTab';
