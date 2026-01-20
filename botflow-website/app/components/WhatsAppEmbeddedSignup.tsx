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
    const [status, setStatus] = useState<'loading' | 'ready' | 'connecting' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [appId, setAppId] = useState<string | null>(null);
    const [sdkLoaded, setSdkLoaded] = useState(false);

    // Load Meta SDK and configuration
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const config = await api.getEmbeddedSignupConfig();
                if (!config.appId) {
                    setStatus('error');
                    setErrorMessage('WhatsApp signup is not configured. Please contact support.');
                    return;
                }
                setAppId(config.appId);
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Failed to load configuration');
            }
        };
        loadConfig();
    }, []);

    // Load Facebook SDK
    useEffect(() => {
        if (!appId) return;

        // Check if SDK is already loaded
        if (window.FB) {
            setSdkLoaded(true);
            setStatus('ready');
            return;
        }

        // Initialize Facebook SDK
        window.fbAsyncInit = function() {
            window.FB.init({
                appId: appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });
            setSdkLoaded(true);
            setStatus('ready');
        };

        // Load the SDK asynchronously
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);

        return () => {
            // Cleanup is not needed for SDK script
        };
    }, [appId]);

    const handleConnect = useCallback(() => {
        if (!window.FB || !sdkLoaded) {
            setErrorMessage('Facebook SDK not loaded. Please refresh and try again.');
            return;
        }

        setStatus('connecting');
        setErrorMessage(null);

        // Launch WhatsApp Embedded Signup
        window.FB.login(
            async (response: any) => {
                if (response.authResponse) {
                    const { accessToken } = response.authResponse;

                    // The user completed the flow - now we need to get the WABA details
                    // In a real implementation, you would use the accessToken to fetch
                    // the phone_number_id, waba_id, etc. from Meta's API

                    // For now, we'll show a success message and ask user to complete setup
                    // This is a simplified flow - in production, you'd use Meta's debug_token
                    // endpoint to get the full credentials

                    try {
                        // Note: In a real implementation, you would:
                        // 1. Exchange the short-lived token for a long-lived token
                        // 2. Use the token to fetch WABA and phone number details
                        // 3. Pass all credentials to the backend

                        // Simplified: Show manual input modal for now
                        setStatus('success');

                        // In production, you would call:
                        // await api.connectWhatsApp({
                        //     accessToken: longLivedToken,
                        //     phoneNumberId: phoneNumberId,
                        //     wabaId: wabaId,
                        //     phoneNumber: phoneNumber,
                        //     displayName: displayName,
                        // });
                        // onSuccess();

                    } catch (err: any) {
                        setStatus('error');
                        setErrorMessage(err.message || 'Failed to save WhatsApp credentials');
                    }
                } else {
                    // User cancelled or error occurred
                    setStatus('ready');
                    if (response.error) {
                        setErrorMessage(`Connection failed: ${response.error.message || 'Unknown error'}`);
                    }
                }
            },
            {
                config_id: '', // Set your config ID from Meta Developer Console
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {
                        // Pre-fill business information if available
                    },
                    featureType: '',
                    sessionInfoVersion: 2,
                }
            }
        );
    }, [sdkLoaded, onSuccess]);

    // Manual credential input (backup method)
    const [manualMode, setManualMode] = useState(false);
    const [credentials, setCredentials] = useState({
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        phoneNumber: '',
        displayName: '',
    });

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('connecting');
        setErrorMessage(null);

        try {
            await api.connectWhatsApp(credentials);
            onSuccess();
        } catch (err: any) {
            setStatus('error');
            setErrorMessage(err.message || 'Failed to connect WhatsApp');
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
                    {status === 'loading' && (
                        <div className="py-12 text-center">
                            <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-green-500 rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-600">Loading...</p>
                        </div>
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
                                    Connect via Meta Business
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    You'll be redirected to Meta to authorize your WhatsApp Business account.
                                </p>
                            </div>

                            <button
                                onClick={handleConnect}
                                className="w-full py-3 px-4 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5] transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                                Continue with Facebook
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white text-gray-500">or</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setManualMode(true)}
                                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Enter credentials manually
                            </button>

                            <p className="text-xs text-gray-500 text-center">
                                By connecting, you agree to Meta's terms of service and privacy policy.
                            </p>
                        </div>
                    )}

                    {status === 'ready' && manualMode && (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                Enter your WhatsApp Cloud API credentials from the Meta Developer Console.
                            </p>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
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
                                    Phone Number ID
                                </label>
                                <input
                                    type="text"
                                    value={credentials.phoneNumberId}
                                    onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                                    placeholder="1234567890123456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Found in Meta Developer Console → WhatsApp → API Setup
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    WABA ID
                                </label>
                                <input
                                    type="text"
                                    value={credentials.wabaId}
                                    onChange={(e) => setCredentials({ ...credentials, wabaId: e.target.value })}
                                    placeholder="1234567890123456"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    WhatsApp Business Account ID from Meta Business Suite
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Access Token
                                </label>
                                <textarea
                                    value={credentials.accessToken}
                                    onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                                    placeholder="EAAG..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Permanent token from System User in Meta Business Settings
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setManualMode(false)}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                                >
                                    Connect
                                </button>
                            </div>
                        </form>
                    )}

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
                            <p className="text-gray-600 text-sm mb-6">
                                Your WhatsApp Business account is now connected to BotFlow.
                            </p>
                            <button
                                onClick={onSuccess}
                                className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Failed</h3>
                            <p className="text-red-600 text-sm mb-6">
                                {errorMessage || 'An unexpected error occurred. Please try again.'}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Close
                                </button>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
