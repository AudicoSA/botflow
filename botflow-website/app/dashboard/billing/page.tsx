'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Plan {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    conversationsLimit: number;
    botsLimit: number;
    popular?: boolean;
}

interface Subscription {
    id: string;
    plan: Plan;
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
}

interface UsageStats {
    conversations: {
        used: number;
        limit: number;
    };
    bots: {
        used: number;
        limit: number;
    };
}

const plans: Plan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 499,
        currency: 'ZAR',
        interval: 'month',
        conversationsLimit: 500,
        botsLimit: 1,
        features: [
            '500 conversations/month',
            '1 WhatsApp number',
            '1 AI bot',
            'Basic templates',
            'Email support',
        ],
    },
    {
        id: 'business',
        name: 'Business',
        price: 899,
        currency: 'ZAR',
        interval: 'month',
        conversationsLimit: 2000,
        botsLimit: 3,
        popular: true,
        features: [
            '2,000 conversations/month',
            '2 WhatsApp numbers',
            '3 AI bots',
            'All templates',
            'Knowledge base uploads',
            'Priority support',
            'Analytics dashboard',
        ],
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 1999,
        currency: 'ZAR',
        interval: 'month',
        conversationsLimit: 10000,
        botsLimit: 10,
        features: [
            '10,000 conversations/month',
            '5 WhatsApp numbers',
            '10 AI bots',
            'All templates',
            'Unlimited knowledge uploads',
            'Custom integrations',
            'Dedicated support',
            'API access',
            'Custom branding',
        ],
    },
];

export default function BillingPage() {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [usage, setUsage] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [showCancelModal, setShowCancelModal] = useState(false);

    useEffect(() => {
        loadBillingData();
    }, []);

    const loadBillingData = async () => {
        try {
            // TODO: Implement billing API endpoints
            // For now, simulate with mock data
            setSubscription(null); // No subscription = free trial
            setUsage({
                conversations: { used: 45, limit: 100 },
                bots: { used: 1, limit: 1 },
            });
        } catch (err) {
            console.error('Failed to load billing data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async (planId: string) => {
        setUpgrading(planId);

        try {
            // In production, this would:
            // 1. Create a Paystack transaction
            // 2. Redirect to Paystack checkout
            // 3. Handle callback to update subscription

            // For now, show a message
            alert(`Paystack checkout for ${planId} plan coming soon! We'll redirect you to complete payment.`);

            // Example Paystack integration:
            // const response = await api.createCheckout(planId);
            // window.location.href = response.checkoutUrl;

        } catch (err: any) {
            alert(err.message || 'Failed to start checkout');
        } finally {
            setUpgrading(null);
        }
    };

    const handleCancelSubscription = async () => {
        try {
            // TODO: Implement cancel API
            alert('Subscription cancellation coming soon');
            setShowCancelModal(false);
        } catch (err: any) {
            alert(err.message || 'Failed to cancel subscription');
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-ZA', {
            style: 'currency',
            currency: 'ZAR',
            minimumFractionDigits: 0,
        }).format(price);
    };

    const getUsagePercentage = (used: number, limit: number) => {
        return Math.min((used / limit) * 100, 100);
    };

    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-red-500';
        if (percentage >= 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto py-12 text-center">
                <div className="animate-spin w-12 h-12 border-4 border-gray-300 border-t-primary-blue rounded-full mx-auto"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing & Subscription</h1>
                <p className="mt-1 text-gray-600">
                    Manage your subscription and view usage statistics.
                </p>
            </div>

            {/* Current Plan */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Plan</h2>

                {subscription ? (
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xl font-bold text-gray-900">
                                {subscription.plan.name} Plan
                            </p>
                            <p className="text-gray-600">
                                {formatPrice(subscription.plan.price)}/month
                            </p>
                            {subscription.cancelAtPeriodEnd ? (
                                <p className="text-sm text-red-600 mt-1">
                                    Cancels on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-500 mt-1">
                                    Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                        {!subscription.cancelAtPeriodEnd && (
                            <button
                                onClick={() => setShowCancelModal(true)}
                                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-medium text-sm"
                            >
                                Cancel Subscription
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Free Trial</p>
                                <p className="text-sm text-gray-600">
                                    100 conversations included. Upgrade to unlock more features.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Usage Stats */}
            {usage && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Conversations */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Conversations</span>
                                <span className="font-medium text-gray-900">
                                    {usage.conversations.used} / {usage.conversations.limit}
                                </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getUsageColor(getUsagePercentage(usage.conversations.used, usage.conversations.limit))} transition-all`}
                                    style={{ width: `${getUsagePercentage(usage.conversations.used, usage.conversations.limit)}%` }}
                                />
                            </div>
                            {getUsagePercentage(usage.conversations.used, usage.conversations.limit) >= 90 && (
                                <p className="text-xs text-red-600 mt-1">
                                    Approaching limit! Upgrade to continue uninterrupted service.
                                </p>
                            )}
                        </div>

                        {/* Bots */}
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Active Bots</span>
                                <span className="font-medium text-gray-900">
                                    {usage.bots.used} / {usage.bots.limit}
                                </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getUsageColor(getUsagePercentage(usage.bots.used, usage.bots.limit))} transition-all`}
                                    style={{ width: `${getUsagePercentage(usage.bots.used, usage.bots.limit)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pricing Plans */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {subscription ? 'Change Plan' : 'Choose a Plan'}
                </h2>

                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.id}
                            className={`bg-white rounded-xl border-2 p-6 relative ${
                                plan.popular
                                    ? 'border-primary-blue shadow-lg'
                                    : 'border-gray-200'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary-blue text-white text-xs font-semibold px-3 py-1 rounded-full">
                                        Most Popular
                                    </span>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                                <div className="mt-2">
                                    <span className="text-3xl font-bold text-gray-900">
                                        {formatPrice(plan.price)}
                                    </span>
                                    <span className="text-gray-500">/month</span>
                                </div>
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm text-gray-600">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => handleUpgrade(plan.id)}
                                disabled={upgrading === plan.id || (subscription?.plan.id === plan.id)}
                                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                                    plan.popular
                                        ? 'gradient-bg text-white hover:shadow-lg'
                                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {upgrading === plan.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </span>
                                ) : subscription?.plan.id === plan.id ? (
                                    'Current Plan'
                                ) : subscription ? (
                                    plan.price > (subscription.plan.price || 0) ? 'Upgrade' : 'Downgrade'
                                ) : (
                                    'Get Started'
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h2>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center">
                            <svg className="w-8 h-5" viewBox="0 0 32 20" fill="none">
                                <rect width="32" height="20" rx="2" fill="#016FD0"/>
                                <text x="16" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">CARD</text>
                            </svg>
                        </div>
                        <div className="text-sm text-gray-500">
                            No payment method added
                        </div>
                    </div>
                    <button className="text-primary-blue hover:underline text-sm font-medium">
                        Add Payment Method
                    </button>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                        <strong>Secure payments powered by Paystack.</strong> We accept Visa, Mastercard, and local South African bank cards.
                    </p>
                </div>
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>

                <div className="space-y-4">
                    <div>
                        <h3 className="font-medium text-gray-900">What counts as a conversation?</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            A conversation is a thread of messages with a single customer. Each new customer contact starts a new conversation.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">Can I change plans anytime?</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            Yes! You can upgrade or downgrade at any time. Changes take effect immediately, and we'll prorate your billing.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">What happens if I exceed my limit?</h3>
                        <p className="text-sm text-gray-600 mt-1">
                            We'll notify you when you're approaching your limit. You can upgrade to continue service or wait for the next billing cycle.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cancel Modal */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription?</h3>
                        <p className="text-gray-600 mb-6">
                            Your subscription will remain active until the end of your current billing period. After that, you'll be moved to the free plan.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelModal(false)}
                                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                            >
                                Keep Subscription
                            </button>
                            <button
                                onClick={handleCancelSubscription}
                                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
