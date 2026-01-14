'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleAuthError() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const error = searchParams.get('error') || 'Authentication failed';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Google Sign-In Failed</h1>
                <p className="text-gray-600 mb-6">{error}</p>
                <div className="space-y-3">
                    <button
                        onClick={() => router.push('/login')}
                        className="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                        Try again
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                    >
                        Back to home
                    </button>
                </div>
            </div>
        </div>
    );
}
