'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BOT_TEMPLATES = [
    {
        id: 'taxi_service',
        name: 'Taxi & Shuttle Service',
        description: 'Book rides, quote prices, and manage pickups.',
        icon: '🚖',
        features: ['Ride booking', 'Price estimation', 'Driver dispatch'],
        color: 'from-yellow-400 to-yellow-600',
        systemPrompt: "You are a helpful dispatcher for a Taxi & Shuttle service. Your goal is to help customers book rides efficiently.\n\nKey Information to Collect:\n- Pickup Location\n- Destination\n- Pickup Time\n- Number of Passengers\n\nTone: Professional, efficient, and friendly.\nAlways confirm the total price estimate before finalizing the booking.",
    },
    {
        id: 'restaurant_order',
        name: 'Restaurant (Takeaway/Delivery)',
        description: 'Take food orders, show menu, and manage delivery.',
        icon: '🍔',
        features: ['Menu browsing', 'Order placement', 'Delivery tracking'],
        color: 'from-orange-500 to-red-500',
        systemPrompt: "You are a digital waiter for a restaurant. Your goal is to help customers place food orders for takeaway or delivery.\n\nCapabilities:\n- Show menu items\n- Take orders\n- Confirm allergies\n- Collect delivery address\n\nTone: Appetizing, enthusiastic, and helpful.",
    },
    {
        id: 'hair_beauty',
        name: 'Hair & Beauty Salon',
        description: 'Schedule appointments and answer service questions.',
        icon: '✂️',
        features: ['Appointment booking', 'Service menu', 'Stylist selection'],
        color: 'from-pink-400 to-rose-500',
        systemPrompt: "You are the receptionist for a high-end Hair & Beauty Salon. Your goal is to fill the appointment calendar.\n\nTasks:\n- efficient scheduling\n- explaining treatments\n\nTone: Chic, friendly, and welcoming.",
    },
    {
        id: 'medical_clinic',
        name: 'Medical Clinic / Dentist',
        description: 'Triage patients and schedule consultations.',
        icon: '🩺',
        features: ['Patient triage', 'Appointment scheduling', 'FAQ answers'],
        color: 'from-blue-400 to-cyan-500',
        systemPrompt: "You are a medical receptionist. You assist patients in booking consultations. \n\nIMPORTANT: If a patient describes a life-threatening emergency, tell them to call emergency services immediately.\n\nFor non-emergencies, collect:\n- Patient Name\n- Reason for visit\n- Preferred time\n\nTone: Professional, empathetic, and calm.",
    },
    {
        id: 'real_estate',
        name: 'Real Estate Agent',
        description: 'Qualify leads and schedule property viewings.',
        icon: '🏠',
        features: ['Lead qualification', 'Property details', 'Viewing scheduler'],
        color: 'from-indigo-500 to-purple-500',
        systemPrompt: "You are a Real Estate Assistant. Your goal is to qualify potential buyers/renters and schedule viewings.\n\nQualifying Questions:\n- Budget range\n- Preferred location\n- Move-in date\n\nTone: Professional, knowledgeable, and persuasive.",
    },
    {
        id: 'ecommerce_support',
        name: 'E-commerce Store',
        description: 'Product recommendations and order support.',
        icon: '🛍️',
        features: ['Product search', 'Order status', 'Returns help'],
        color: 'from-purple-500 to-pink-500',
        systemPrompt: "You are a Sales Assistant for an online store. Help customers find the perfect product and answer shipping questions.\n\nTone: Helpful and sales-oriented.",
    },
    {
        id: 'gym_fitness',
        name: 'Gym & Fitness Studio',
        description: 'Class booking and membership inquiries.',
        icon: '💪',
        features: ['Class schedule', 'Membership signup', 'Trainer booking'],
        color: 'from-emerald-400 to-green-600',
        systemPrompt: "You are a Fitness Consultant. Encourage users to sign up for classes or memberships.\n\nTone: Energetic, motivating, and healthy.",
    },
];

export default function CreateBotPage() {
    const router = useRouter();
    const [step, setStep] = useState<'template' | 'config'>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [botConfig, setBotConfig] = useState({
        name: '',
        description: '',
        welcomeMessage: '',
        fallbackMessage: '',
        systemPrompt: '',
    });
    const [loading, setLoading] = useState(false);

    const template = BOT_TEMPLATES.find((t) => t.id === selectedTemplate);

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplate(templateId);
        setStep('config');

        // Pre-fill with template defaults
        const tmpl = BOT_TEMPLATES.find((t) => t.id === templateId);
        if (tmpl) {
            setBotConfig({
                name: tmpl.name,
                description: tmpl.description,
                welcomeMessage: `Hi! I'm your ${tmpl.name} Assistant. How can I help you today?`,
                fallbackMessage: "I'm sorry, I didn't quite catch that. Could you please say it again?",
                systemPrompt: (tmpl as any).systemPrompt || '',
            });
        }
    };

    const handleCreateBot = async () => {
        if (!selectedTemplate) return;

        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/bots`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // TODO: Add auth token when auth is implemented
                },
                body: JSON.stringify({
                    templateId: selectedTemplate,
                    config: botConfig,
                    systemPrompt: botConfig.systemPrompt,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(`Bot "${data.name || 'New Bot'}" created successfully!`);
                router.push('/dashboard/bots');
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error || 'Failed to create bot';
                const details = errorData.details || errorData.message || 'Please try again.';
                alert(`Error: ${errorMessage}\nDetails: ${details}`);
            }
        } catch (error) {
            console.error('Error creating bot:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Create New Bot</h2>
                    <p className="text-gray-600 mt-1">
                        {step === 'template' ? 'Choose a template to get started' : 'Configure your bot'}
                    </p>
                </div>
                <Link
                    href="/dashboard/bots"
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                    Cancel
                </Link>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${step === 'template' ? 'text-primary-blue' : 'text-green-600'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'template' ? 'bg-primary-blue text-white' : 'bg-green-600 text-white'}`}>
                        {step === 'config' ? '✓' : '1'}
                    </div>
                    <span className="font-medium">Choose Template</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 rounded">
                    <div className={`h-full bg-primary-blue rounded transition-all ${step === 'config' ? 'w-full' : 'w-0'}`} />
                </div>
                <div className={`flex items-center gap-2 ${step === 'config' ? 'text-primary-blue' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 'config' ? 'bg-primary-blue text-white' : 'bg-gray-200'}`}>
                        2
                    </div>
                    <span className="font-medium">Configure</span>
                </div>
            </div>

            {/* Template Selection */}
            {step === 'template' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {BOT_TEMPLATES.map((tmpl) => (
                        <div
                            key={tmpl.id}
                            onClick={() => handleTemplateSelect(tmpl.id)}
                            className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-primary-blue hover:shadow-lg transition-all cursor-pointer group"
                        >
                            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${tmpl.color} flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform`}>
                                {tmpl.icon}
                            </div>
                            <h3 className="font-bold text-gray-900 text-lg mb-2">{tmpl.name}</h3>
                            <p className="text-sm text-gray-600 mb-4">{tmpl.description}</p>
                            <ul className="space-y-2">
                                {tmpl.features.map((feature, index) => (
                                    <li key={index} className="text-xs text-gray-600 flex items-center gap-2">
                                        <span className="text-green-500">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {/* Configuration Form */}
            {step === 'config' && template && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Form */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl`}>
                                    {template.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                                    <p className="text-sm text-gray-600">{template.description}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bot Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={botConfig.name}
                                        onChange={(e) => setBotConfig({ ...botConfig, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                        placeholder="My Awesome Bot"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={botConfig.description}
                                        onChange={(e) => setBotConfig({ ...botConfig, description: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                        rows={3}
                                        placeholder="What does this bot do?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Welcome Message *
                                    </label>
                                    <textarea
                                        value={botConfig.welcomeMessage}
                                        onChange={(e) => setBotConfig({ ...botConfig, welcomeMessage: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                        rows={3}
                                        placeholder="Hi! How can I help you?"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fallback Message
                                    </label>
                                    <textarea
                                        value={botConfig.fallbackMessage}
                                        onChange={(e) => setBotConfig({ ...botConfig, fallbackMessage: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                                        rows={2}
                                        placeholder="I didn't understand that..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep('template')}
                                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleCreateBot}
                                disabled={loading || !botConfig.name || !botConfig.welcomeMessage}
                                className="flex-1 px-6 py-3 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Creating...' : 'Create Bot'}
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-4">Preview</h4>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                            {/* WhatsApp-style preview */}
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold">
                                        {botConfig.name.charAt(0) || 'B'}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{botConfig.name || 'Bot Name'}</div>
                                        <div className="text-xs text-gray-500">Online</div>
                                    </div>
                                </div>
                                <div className="bg-green-100 rounded-lg p-3 text-sm">
                                    {botConfig.welcomeMessage || 'Welcome message will appear here...'}
                                </div>
                            </div>

                            <div className="text-xs text-gray-500 text-center">
                                This is how your bot will appear to users
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
