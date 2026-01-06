'use client';

import { useState } from 'react';

export default function Waitlist() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // TODO: Connect to your backend/email service
        console.log('Waitlist signup:', formData);

        setSubmitted(true);
        setFormData({ name: '', email: '', phone: '', company: '' });

        setTimeout(() => setSubmitted(false), 3000);
    };

    return (
        <section id="waitlist" className="py-24 px-6 gradient-bg">
            <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6">
                    Ready to Automate Your Conversations?
                </h2>
                <p className="text-xl text-white/90 mb-12">
                    Join our beta program and get 50% off for 6 months
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Your name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                    />
                    <input
                        type="email"
                        placeholder="Work email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-6 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                    />
                    <input
                        type="tel"
                        placeholder="Phone number"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-6 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                    />
                    <input
                        type="text"
                        placeholder="Company name"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        className="w-full px-6 py-4 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-white/30"
                    />

                    <button
                        type="submit"
                        className={`w-full py-4 px-8 rounded-xl font-bold text-lg transition-all ${submitted
                                ? 'bg-green-500 text-white'
                                : 'bg-white text-primary-blue hover:shadow-2xl hover:-translate-y-1'
                            }`}
                    >
                        {submitted ? '✓ You\'re on the list!' : 'Join Waitlist'}
                    </button>
                </form>

                <p className="text-white/80 text-sm mt-6">
                    No credit card required • 14-day free trial • Cancel anytime
                </p>
            </div>
        </section>
    );
}
