'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface WhatsAppOnboardingWizardProps {
    onSuccess: () => void;
    onClose: () => void;
}

type Step = 'intro' | 'meta-account' | 'phone-number' | 'credentials' | 'connecting' | 'success' | 'error';

export default function WhatsAppOnboardingWizard({ onSuccess, onClose }: WhatsAppOnboardingWizardProps) {
    const [step, setStep] = useState<Step>('intro');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [credentials, setCredentials] = useState({
        accessToken: '',
        phoneNumberId: '',
        wabaId: '',
        phoneNumber: '',
        displayName: '',
    });

    const handleConnect = async () => {
        setStep('connecting');
        setErrorMessage(null);

        try {
            await api.connectWhatsApp(credentials);
            setStep('success');
            setTimeout(() => onSuccess(), 2000);
        } catch (err: any) {
            setStep('error');
            setErrorMessage(err.message || 'Failed to connect. Please check your credentials.');
        }
    };

    const isCredentialsValid = () => {
        return (
            credentials.phoneNumber.length >= 10 &&
            credentials.phoneNumberId.length >= 10 &&
            credentials.wabaId.length >= 10 &&
            credentials.accessToken.length >= 50
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Connect WhatsApp</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress Bar */}
                {!['connecting', 'success', 'error'].includes(step) && (
                    <div className="px-6 pt-4">
                        <div className="flex items-center gap-2">
                            {['intro', 'meta-account', 'phone-number', 'credentials'].map((s, i) => (
                                <div key={s} className="flex items-center flex-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                        step === s ? 'bg-green-500 text-white' :
                                        ['intro', 'meta-account', 'phone-number', 'credentials'].indexOf(step) > i
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-400'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    {i < 3 && (
                                        <div className={`flex-1 h-1 mx-2 rounded ${
                                            ['intro', 'meta-account', 'phone-number', 'credentials'].indexOf(step) > i
                                                ? 'bg-green-200'
                                                : 'bg-gray-100'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Introduction */}
                    {step === 'intro' && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Let's connect your WhatsApp Business
                                </h3>
                                <p className="text-gray-600">
                                    This takes about 5 minutes. You'll need access to your Meta Business account.
                                </p>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex gap-3">
                                    <span className="text-amber-500 text-xl">⚠️</span>
                                    <div>
                                        <p className="font-medium text-amber-800">Important: Use a business number</p>
                                        <p className="text-sm text-amber-700 mt-1">
                                            Do NOT use your personal WhatsApp number. Your personal chats will be disconnected permanently.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="font-medium text-gray-900">What you'll need:</h4>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-3">
                                        <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <span className="text-gray-600">A Meta Business account (free to create)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <span className="text-gray-600">A phone number for your business (landline or dedicated mobile)</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <span className="text-gray-600">Access to receive SMS or calls on that number</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => setStep('meta-account')}
                                className="w-full py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                            >
                                Let's Get Started
                            </button>
                        </div>
                    )}

                    {/* Step 2: Meta Business Account */}
                    {step === 'meta-account' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Step 1: Open Meta Developer Console
                                </h3>
                                <p className="text-gray-600">
                                    First, we need to access your WhatsApp API settings in Meta.
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-5 space-y-4">
                                <div className="flex items-start gap-4">
                                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Go to Meta Developer Console</p>
                                        <a
                                            href="https://developers.facebook.com/apps"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Open Meta for Developers
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Select or create your app</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            If you don't have an app yet, click "Create App" and select "Business" type.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Add WhatsApp product</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            In your app dashboard, click "Add Product" and select "WhatsApp".
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
                                    <div>
                                        <p className="font-medium text-gray-900">Go to API Setup</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Click <strong>WhatsApp → API Setup</strong> in the left sidebar.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <p className="text-sm text-green-800">
                                    <strong>Pro tip:</strong> Keep the Meta Developer Console open in another tab. You'll copy values from there in the next steps.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('intro')}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('phone-number')}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                >
                                    I'm on API Setup Page
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Phone Number Setup */}
                    {step === 'phone-number' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Step 2: Your Business Phone Number
                                </h3>
                                <p className="text-gray-600">
                                    Enter the phone number you want to use for WhatsApp Business.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={credentials.phoneNumber}
                                        onChange={(e) => setCredentials({ ...credentials, phoneNumber: e.target.value })}
                                        placeholder="+27 12 345 6789"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                                    />
                                    <p className="text-sm text-gray-500 mt-2">
                                        Include country code (e.g., +27 for South Africa)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Business Name (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={credentials.displayName}
                                        onChange={(e) => setCredentials({ ...credentials, displayName: e.target.value })}
                                        placeholder="My Awesome Business"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Note:</strong> If this number is new to WhatsApp, you'll need to verify it in Meta's dashboard first. Meta will send an SMS or call you.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('meta-account')}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep('credentials')}
                                    disabled={!credentials.phoneNumber || credentials.phoneNumber.length < 10}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Continue
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Credentials */}
                    {step === 'credentials' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Step 3: Copy Your API Credentials
                                </h3>
                                <p className="text-gray-600">
                                    Copy these values from the API Setup page in Meta Developer Console.
                                </p>
                            </div>

                            <div className="space-y-5">
                                {/* Phone Number ID */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-900">
                                                Phone Number ID
                                            </label>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Found under "From" dropdown → Click the number → Copy "Phone number ID"
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={credentials.phoneNumberId}
                                        onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                                        placeholder="e.g., 123456789012345"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    />
                                </div>

                                {/* WABA ID */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-900">
                                                WhatsApp Business Account ID
                                            </label>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Found under "From" dropdown → Click the number → Copy "WhatsApp Business Account ID"
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={credentials.wabaId}
                                        onChange={(e) => setCredentials({ ...credentials, wabaId: e.target.value })}
                                        placeholder="e.g., 123456789012345"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    />
                                </div>

                                {/* Access Token */}
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-900">
                                                Temporary Access Token
                                            </label>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Click "Generate" next to "Temporary access token" and copy it
                                            </p>
                                        </div>
                                    </div>
                                    <textarea
                                        value={credentials.accessToken}
                                        onChange={(e) => setCredentials({ ...credentials, accessToken: e.target.value })}
                                        placeholder="EAAxxxxxxx... (starts with EAA)"
                                        rows={3}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                                    />
                                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        Temporary tokens expire in 24 hours. For permanent access, create a System User token.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('phone-number')}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleConnect}
                                    disabled={!isCredentialsValid()}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Connect WhatsApp
                                </button>
                            </div>

                            {!isCredentialsValid() && (
                                <p className="text-center text-sm text-gray-500">
                                    Please fill in all fields to continue
                                </p>
                            )}
                        </div>
                    )}

                    {/* Connecting State */}
                    {step === 'connecting' && (
                        <div className="py-12 text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-green-500 rounded-full mx-auto mb-6"></div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connecting...</h3>
                            <p className="text-gray-600">
                                Verifying your credentials with Meta
                            </p>
                        </div>
                    )}

                    {/* Success State */}
                    {step === 'success' && (
                        <div className="py-12 text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Connected!</h3>
                            <p className="text-gray-600 mb-6">
                                Your business is now ready to receive WhatsApp messages.
                            </p>
                            <p className="text-sm text-gray-500">
                                Redirecting to dashboard...
                            </p>
                        </div>
                    )}

                    {/* Error State */}
                    {step === 'error' && (
                        <div className="py-8 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection Failed</h3>
                            <p className="text-red-600 mb-6">
                                {errorMessage}
                            </p>

                            <div className="bg-gray-50 rounded-xl p-4 text-left mb-6">
                                <p className="font-medium text-gray-900 mb-2">Common issues:</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Access token has expired (generate a new one)</li>
                                    <li>• Phone number ID doesn't match the WABA ID</li>
                                    <li>• Phone number hasn't been verified in Meta</li>
                                    <li>• Incorrect copy/paste (check for extra spaces)</li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('credentials')}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Help Footer */}
                {!['connecting', 'success'].includes(step) && (
                    <div className="px-6 pb-6">
                        <div className="border-t border-gray-200 pt-4">
                            <p className="text-center text-sm text-gray-500">
                                Stuck? <a href="mailto:support@botflow.co.za?subject=WhatsApp%20Setup%20Help" className="text-green-600 hover:underline">Email us</a> and we'll help you connect.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
