'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import WhatsAppOnboardingWizard from '@/app/components/WhatsAppOnboardingWizard';

interface WhatsAppAccount {
    id: string;
    phone_number: string;
    display_name: string;
    provider: string;
    is_active: boolean;
    created_at: string;
    meta_waba_id?: string;
}

export default function WhatsAppPage() {
    const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSignup, setShowSignup] = useState(false);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);
    const [testingConnection, setTestingConnection] = useState<string | null>(null);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getWhatsAppAccounts();
            setAccounts(response.accounts || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load WhatsApp accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async (accountId: string) => {
        if (!confirm('Are you sure you want to disconnect this WhatsApp account?')) {
            return;
        }

        try {
            setDisconnecting(accountId);
            await api.disconnectWhatsApp(accountId);
            await loadAccounts();
        } catch (err: any) {
            alert(err.message || 'Failed to disconnect account');
        } finally {
            setDisconnecting(null);
        }
    };

    const handleTestConnection = async (accountId: string) => {
        try {
            setTestingConnection(accountId);
            const result = await api.testWhatsAppConnection(accountId);
            if (result.success) {
                alert('Connection successful! Your WhatsApp account is properly configured.');
            } else {
                alert(`Connection issue: ${result.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to test connection');
        } finally {
            setTestingConnection(null);
        }
    };

    const handleSignupSuccess = () => {
        setShowSignup(false);
        loadAccounts();
    };

    const activeAccounts = accounts.filter(a => a.is_active);

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">WhatsApp Connection</h1>
                <p className="mt-1 text-gray-600">
                    Connect your WhatsApp Business number to start receiving and responding to customer messages.
                </p>
            </div>

            {/* Number Guidance */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-blue-900 mb-4">Which number should I use?</h2>

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">1</span>
                        <div>
                            <p className="font-semibold text-gray-900">RECOMMENDED: Business Landline</p>
                            <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                                <li>Use your existing office number (e.g., 010 xxx xxxx)</li>
                                <li>Voice calls still go to your phone/call center</li>
                                <li>WhatsApp messages go to BotFlow</li>
                                <li>Customers already know this number</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-sm font-bold">2</span>
                        <div>
                            <p className="font-semibold text-gray-900">ALTERNATIVE: Dedicated Mobile</p>
                            <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                                <li>Get a prepaid SIM for R29 at Vodacom/MTN</li>
                                <li>RICA registration takes 10 minutes</li>
                                <li>Keep it separate from personal WhatsApp</li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">!</span>
                        <div>
                            <p className="font-semibold text-red-700">DO NOT USE: Personal Mobile</p>
                            <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                                <li>Your personal WhatsApp will be disconnected</li>
                                <li>Friends and family will talk to your bot</li>
                                <li>You cannot undo this</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Connected Accounts */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">Connected Accounts</h2>
                    <button
                        onClick={() => setShowSignup(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Connect WhatsApp
                    </button>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-gray-500">
                        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full mx-auto mb-4"></div>
                        Loading accounts...
                    </div>
                ) : error ? (
                    <div className="py-12 text-center">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={loadAccounts}
                            className="text-blue-500 hover:text-blue-600 font-medium"
                        >
                            Try again
                        </button>
                    </div>
                ) : activeAccounts.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-600 mb-4">No WhatsApp accounts connected yet</p>
                        <button
                            onClick={() => setShowSignup(true)}
                            className="text-green-600 hover:text-green-700 font-medium"
                        >
                            Connect your first account
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">{account.display_name}</p>
                                        <p className="text-sm text-gray-500">{account.phone_number}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Connected via {account.provider === 'meta' ? 'Meta Cloud API' : account.provider}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Active
                                    </span>
                                    <button
                                        onClick={() => handleTestConnection(account.id)}
                                        disabled={testingConnection === account.id}
                                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {testingConnection === account.id ? 'Testing...' : 'Test'}
                                    </button>
                                    <button
                                        onClick={() => handleDisconnect(account.id)}
                                        disabled={disconnecting === account.id}
                                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {disconnecting === account.id ? 'Disconnecting...' : 'Disconnect'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* How it Works */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">How it Works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl font-bold text-blue-600">1</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">Connect</h3>
                        <p className="text-sm text-gray-600">
                            Click "Connect WhatsApp" and follow the step-by-step guide to link your business number.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl font-bold text-blue-600">2</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">Assign a Bot</h3>
                        <p className="text-sm text-gray-600">
                            Create a bot from a template and assign it to your WhatsApp number.
                        </p>
                    </div>
                    <div className="text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl font-bold text-blue-600">3</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1">Go Live</h3>
                        <p className="text-sm text-gray-600">
                            Your bot will automatically respond to customer messages 24/7.
                        </p>
                    </div>
                </div>
            </div>

            {/* Need Help Section */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold mb-1">Need help connecting?</h2>
                        <p className="text-green-100 text-sm">
                            Our team can set up WhatsApp for you - free for Starter plan and above.
                        </p>
                    </div>
                    <a
                        href="mailto:support@botflow.co.za?subject=Help%20connecting%20WhatsApp&body=Hi!%20I%20need%20help%20connecting%20my%20WhatsApp%20Business%20to%20BotFlow."
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors whitespace-nowrap"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email Support
                    </a>
                </div>
            </div>

            {/* Onboarding Wizard Modal */}
            {showSignup && (
                <WhatsAppOnboardingWizard
                    onSuccess={handleSignupSuccess}
                    onClose={() => setShowSignup(false)}
                />
            )}
        </div>
    );
}
