'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleAuthSuccess() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

    useEffect(() => {
        const token = searchParams.get('token');
        const email = searchParams.get('email');
        const organizationId = searchParams.get('organizationId');
        const whatsappAccountId = searchParams.get('whatsappAccountId');
        const isNewUser = searchParams.get('isNewUser') === 'true';

        if (!token) {
            setStatus('error');
            return;
        }

        try {
            // Store authentication data
            localStorage.setItem('botflow_token', token);
            if (email) localStorage.setItem('botflow_email', email);
            if (organizationId) localStorage.setItem('botflow_organizationId', organizationId);
            if (whatsappAccountId) localStorage.setItem('botflow_whatsappAccountId', whatsappAccountId);

            setStatus('success');

            // Redirect to dashboard after 1 second
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (error) {
            console.error('Error storing auth data:', error);
            setStatus('error');
        }
    }, [searchParams, router]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {status === 'processing' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center animate-pulse">
                            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h1>
                        <p className="text-gray-600">Please wait while we set up your account</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
                        <p className="text-gray-600">Redirecting to your dashboard...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-600 mb-6">Failed to complete sign-in</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                        >
                            Back to login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
