'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function SignupPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        organizationName: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.signup(formData);
            router.push('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center">
                            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold text-gray-900">BotFlow</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Get started</h1>
                    <p className="text-gray-600">Create your account in seconds</p>
                </div>

                {/* Signup Form */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                placeholder="John Doe"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                placeholder="you@company.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                placeholder="••••••••"
                            />
                            <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Company Name
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.organizationName}
                                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                placeholder="Acme Inc"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full gradient-bg text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Creating account...' : 'Create account'}
                        </button>

                        <p className="text-xs text-gray-500 text-center">
                            By signing up, you agree to our{' '}
                            <Link href="/terms" className="text-primary-blue hover:underline">
                                Terms
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-primary-blue hover:underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Already have an account?{' '}
                            <Link href="/login" className="text-primary-blue font-semibold hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Back to home */}
                <div className="text-center mt-6">
                    <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm">
                        ← Back to home
                    </Link>
                </div>
            </div>
        </div>
    );
}
