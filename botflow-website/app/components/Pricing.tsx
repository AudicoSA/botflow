import Link from 'next/link';

export default function Pricing() {
    const plans = [
        {
            name: 'Starter',
            price: '499',
            features: [
                '1 WhatsApp number',
                '1,000 free conversations/month',
                '3 task-specific bots',
                'Basic analytics',
                'Email support'
            ],
            cta: 'Get Started',
            featured: false
        },
        {
            name: 'Growth',
            price: '899',
            features: [
                '1 WhatsApp number',
                '5,000 free conversations/month',
                '10 task-specific bots',
                'Advanced analytics',
                'CRM integrations',
                'Priority support'
            ],
            cta: 'Get Started',
            featured: true
        },
        {
            name: 'Professional',
            price: '1,999',
            features: [
                '2 WhatsApp numbers',
                '15,000 free conversations/month',
                'Unlimited bots',
                'Advanced AI features',
                'Full integrations',
                'Phone & chat support'
            ],
            cta: 'Get Started',
            featured: false
        }
    ];

    return (
        <section id="pricing" className="py-24 px-6 bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-extrabold mb-4">Simple, Transparent Pricing</h2>
                    <p className="text-xl text-gray-600">Choose the plan that's right for your business</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {plans.map((plan, index) => (
                        <div
                            key={index}
                            className={`relative bg-white rounded-3xl p-8 ${plan.featured
                                ? 'border-2 border-primary-blue shadow-2xl scale-105'
                                : 'border border-gray-200 shadow-lg'
                                }`}
                        >
                            {plan.featured && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 gradient-bg text-white rounded-full text-sm font-semibold">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-8">
                                <h3 className="text-2xl font-bold mb-4">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-gray-600 text-2xl font-semibold">R</span>
                                    <span className="text-5xl font-extrabold">{plan.price}</span>
                                    <span className="text-gray-600 text-lg">/month</span>
                                </div>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-gray-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="#waitlist"
                                className={`block text-center py-4 px-6 rounded-xl font-semibold transition-all ${plan.featured
                                    ? 'gradient-bg text-white hover:shadow-xl hover:-translate-y-1'
                                    : 'border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                                    }`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
