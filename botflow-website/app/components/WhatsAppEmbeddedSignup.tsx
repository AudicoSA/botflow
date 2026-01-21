'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface WhatsAppEmbeddedSignupProps {
    onSuccess: () => void;
    onClose: () => void;
}

declare global {
    interface Window {
        fbAsyncInit: () => void;
        FB: {
            init: (params: any) => void;
            login: (callback: (response: any) => void, params: any) => void;
        };
    }
}

export default function WhatsAppEmbeddedSignup({ onSuccess, onClose }: WhatsAppEmbeddedSignupProps) {
    const [status, setStatus] = useState<'ready' | 'connecting' | 'success' | 'error'>('ready');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [manualMode, setManualMode] = useState(true); // Default to manual mode for reliability
    const [sdkAvailable, setSdkAvailable] = useState(false);
    const [credentials, setCredentials] = useState({
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        phoneNumber: '',
        displayName: '',
    });

    // Try to load Facebook SDK (but don't block on it)
    useEffect(() => {
        const loadSdk = async () => {
            try {
                const config = await api.getEmbeddedSignupConfig();
                if (!config.appId) {
                    return; // SDK not configured, manual mode only
                }

                // Check if SDK is already loaded
                if (window.FB) {
                    setSdkAvailable(true);
                    return;
                }

                // Try to load the SDK with a timeout
                const timeoutId = setTimeout(() => {
                    // SDK didn't load in time, stay in manual mode
                    console.log('Facebook SDK load timeout, using manual mode');
                }, 5000);

                window.fbAsyncInit = function() {
                    clearTimeout(timeoutId);
                    window.FB.init({
                        appId: config.appId,
                        cookie: true,
                        xfbml: true,
                        version: 'v18.0'
                    });
                    setSdkAvailable(true);
                };

                const script = document.createElement('script');
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                script.async = true;
                script.defer = true;
                script.crossOrigin = 'anonymous';
                script.onerror = () => {
                    clearTimeout(timeoutId);
                    console.log('Facebook SDK failed to load, using manual mode');
                };
                document.body.appendChild(script);
            } catch (err) {
                console.log('Failed to get SDK config, using manual mode');
            }
        };
        loadSdk();
    }, []);

    const handleFacebookConnect = useCallback(() => {
        if (!window.FB || !sdkAvailable) {
            setErrorMessage('Facebook connection is temporarily unavailable. Please use manual setup.');
            setManualMode(true);
            return;
        }

        setStatus('connecting');
        setErrorMessage(null);

        try {
            window.FB.login(
                async (response: any) => {
                    if (response.authResponse) {
                        // Success - but we still need the user to provide some details
                        setStatus('ready');
                        setManualMode(true);
                        setCredentials(prev => ({
                            ...prev,
                            accessToken: response.authResponse.accessToken || '',
                        }));
                        setErrorMessage('Please complete the remaining fields below.');
                    } else {
                        setStatus('ready');
                        if (response.error) {
                            setErrorMessage(`Connection cancelled. Please try manual setup instead.`);
                        }
                        setManualMode(true);
                    }
                },
                {
                    config_id: '',
                    response_type: 'code',
                    override_default_response_type: true,
                    extras: {
                        featureType: '',
                        sessionInfoVersion: 2,
                    }
                }
            );
        } catch (err) {
            setStatus('ready');
            setManualMode(true);
            setErrorMessage('Facebook connection failed. Please use manual setup.');
        }
    }, [sdkAvailable]);

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('connecting');
        setErrorMessage(null);

        try {
            await api.connectWhatsApp(credentials);
            setStatus('success');
            setTimeout(() => onSuccess(), 1500);
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to connect WhatsApp. Please check your credentials.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Connect WhatsApp</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {status === 'connecting' && (
                        <div className="py-12 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Connecting your WhatsApp account...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connected Successfully!</h3>
                            <p className="text-gray-600 text-sm">
                                Your WhatsApp Business account is now connected to BotFlow.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Failed</h3>
                            <p className="text-red-600 text-sm mb-6">
                                {errorMessage || 'An unexpected error occurred. Please try again.'}
                            </p>
                            <button
                                onClick={() => {
                                    setStatus('ready');
                                    setErrorMessage(null);
                                }}
                                className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {status === 'ready' && manualMode && (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Get these from Meta Developer Console:</strong><br />
                                    Go to your app → WhatsApp → API Setup
                                </p>
                            </div>

                            {errorMessage && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <p className="text-sm text-yellow-800">{errorMessage}</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="tel"
                                    value={credentials.phoneNumber}
                                    onChange={(e) => setCredentials({ ...credentials, phoneNumber: e.target.value })}
                                    placeholder="+27 81 234 5678"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={credentials.displayName}
                                    onChange={(e) => setCredentials({ ...credentials, displayName: e.target.value })}
                                    placeholder="My Business"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={credentials.phoneNumberId}
                                    onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                                    placeholder="1234567890123456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WhatsApp Business Account ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={credentials.wabaId}
                                    onChange={(e) => setCredentials({ ...credentials, wabaId: e.target.value })}
                                    placeholder="1234567890123456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Access Token <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={credentials.accessToken}
                                    onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                                    placeholder="EAA..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    From API Setup page (temporary) or System User (permanent)
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                                >
                                    Connect WhatsApp
                                </button>
                            </div>

                            {sdkAvailable && (
                                <div className="pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setManualMode(false);
                                            handleFacebookConnect();
                                        }}
                                        className="w-full py-2 text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Or try connecting via Facebook instead
                                    </button>
                                </div>
                            )}
                        </form>
                    )}

                    {status === 'ready' && !manualMode && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Connecting via Meta...
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Complete the authorization in the popup window.
                                </p>
                            </div>

                            <button
                                onClick={() => setManualMode(true)}
                                className="w-full py-2 text-sm text-gray-600 hover:text-gray-700"
                            >
                                Cancel and enter credentials manually
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
