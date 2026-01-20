'use client';

import { useState } from 'react';

export default function DataDeletionPage() {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // In production, this would submit to an API endpoint
        setSubmitted(true);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-16 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Data Deletion Request</h1>
                <p className="text-gray-600 mb-6">
                    In accordance with POPIA (Protection of Personal Information Act) and Meta&apos;s data policies,
                    you can request deletion of your personal data from BotFlow.
                </p>

                {!submitted ? (
                    <>
                        <div className="prose prose-gray max-w-none mb-8">
                            <h2 className="text-xl font-semibold mt-6 mb-3">What Data We Delete</h2>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Your account information (name, email, phone number)</li>
                                <li>WhatsApp Business account connection details</li>
                                <li>Conversation history and message logs</li>
                                <li>Bot configurations and settings</li>
                                <li>Knowledge base documents you uploaded</li>
                                <li>Analytics and usage data</li>
                            </ul>

                            <h2 className="text-xl font-semibold mt-6 mb-3">What We Retain</h2>
                            <p className="text-gray-700 mb-4">
                                We may retain certain data as required by law, including:
                            </p>
                            <ul className="list-disc pl-6 text-gray-700 space-y-2">
                                <li>Transaction records (for tax purposes, retained for 5 years)</li>
                                <li>Legal compliance records</li>
                            </ul>

                            <h2 className="text-xl font-semibold mt-6 mb-3">Processing Time</h2>
                            <p className="text-gray-700 mb-4">
                                Data deletion requests are processed within 30 days. You will receive
                                confirmation once your data has been deleted.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="border-t pt-6">
                            <h2 className="text-xl font-semibold mb-4">Submit Deletion Request</h2>
                            <div className="mb-4">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address (associated with your BotFlow account)
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="your@email.com"
                                />
                            </div>
                            <button
                                type="submit"
                                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Request Data Deletion
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-green-800 mb-2">Request Submitted</h2>
                        <p className="text-green-700">
                            Your data deletion request has been received. We will process your request
                            within 30 days and send confirmation to <strong>{email}</strong>.
                        </p>
                        <p className="text-green-700 mt-4">
                            If you have any questions, contact us at: <a href="mailto:privacy@botflow.co.za" className="underline">privacy@botflow.co.za</a>
                        </p>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t">
                    <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
                    <p className="text-gray-700">
                        For data protection inquiries:<br />
                        Email: <a href="mailto:privacy@botflow.co.za" className="text-blue-600 hover:underline">privacy@botflow.co.za</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
