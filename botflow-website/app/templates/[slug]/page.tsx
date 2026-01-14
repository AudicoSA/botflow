
import { templates } from '@/lib/templatesData';
import { notFound } from 'next/navigation';
import TemplateHero from '../../components/TemplateHero';
import Navigation from '../../components/Navigation';
import Footer from '../../components/Footer';
import { Check, Plus, ArrowRight } from 'lucide-react';
import Image from 'next/image';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
    return templates.map((template) => ({
        slug: template.slug,
    }));
}

export default async function TemplatePage({ params }: PageProps) {
    const { slug } = await params;
    const template = templates.find((t) => t.slug === slug);

    if (!template) {
        notFound();
    }

    return (
        <main className="min-h-screen bg-background text-foreground">
            <Navigation />
            <TemplateHero
                title={template.title}
                description={template.fullDescription}
                features={template.features}
            />

            {/* Integration Flow Section */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="text-surf font-semibold tracking-wider uppercase text-sm">Seamless Connectivity</span>
                        <h2 className="text-3xl md:text-4xl font-bold mt-2 text-dark-navy">How It Works</h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4 max-w-5xl mx-auto">
                        {/* Source */}
                        <div className="flex-1 p-8 rounded-2xl bg-gray-50 border border-gray-100 text-center relative z-10 hover:shadow-lg transition-shadow">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                💬
                            </div>
                            <h3 className="font-bold text-lg mb-2">WhatsApp User</h3>
                            <p className="text-gray-500 text-sm">Customer sends a message</p>
                        </div>

                        {/* Connection Line */}
                        <div className="hidden md:flex flex-col items-center">
                            <div className="w-20 h-0.5 bg-gradient-to-r from-gray-200 to-surf/50"></div>
                        </div>
                        <ArrowRight className="md:hidden text-gray-300 w-8 h-8 rotate-90 md:rotate-0" />


                        {/* BotFlow Engine */}
                        <div className="flex-1 p-8 rounded-2xl bg-gradient-to-br from-dark-navy to-surf-darker text-white text-center relative z-20 shadow-xl scale-110">
                            <div className="w-16 h-16 mx-auto bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center mb-4 text-3xl border border-white/20">
                                🤖
                            </div>
                            <h3 className="font-bold text-lg mb-2">BotFlow Engine</h3>
                            <p className="text-gray-300 text-sm">Processes intent & logic</p>
                        </div>

                        {/* Connection Line */}
                        <div className="hidden md:flex flex-col items-center">
                            <div className="w-20 h-0.5 bg-gradient-to-r from-surf/50 to-gray-200"></div>
                        </div>
                        <ArrowRight className="md:hidden text-gray-300 w-8 h-8 rotate-90 md:rotate-0" />

                        {/* Integrations */}
                        <div className="flex-1 p-8 rounded-2xl bg-gray-50 border border-gray-100 text-center relative z-10 hover:shadow-lg transition-shadow">
                            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-2xl flex items-center justify-center mb-4 text-3xl">
                                ⚡
                            </div>
                            <h3 className="font-bold text-lg mb-2">Your Tools</h3>
                            <div className="flex flex-wrap justify-center gap-2 mt-3">
                                {template.integrations.map((tool) => (
                                    <span key={tool} className="text-xs font-medium px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-600">
                                        {tool}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Deep Dive / Sell Sheet */}
            <section className="py-24 bg-sand/30">
                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div className="order-2 md:order-1">
                            <div className="relative">
                                <div className="absolute inset-0 bg-surf transform rotate-3 rounded-3xl opacity-20"></div>
                                <div className="relative bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                                    <h3 className="text-2xl font-bold mb-6 text-dark-navy">Integration Power</h3>
                                    <ul className="space-y-4">
                                        {template.integrations.map((tool, i) => (
                                            <li key={i} className="flex items-center p-3 rounded-lg bg-gray-50 hover:bg-surf-light/10 transition-colors">
                                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm mr-4 text-lg">
                                                    🔗
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800">{tool}</span>
                                                    <span className="block text-sm text-gray-500">Seamlessly connected</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-dark-navy">
                                Everything you need to <br />
                                <span className="text-surf">Automate {template.title}</span>
                            </h2>
                            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                                Don't just chat—act. This template comes pre-configured with the logic to verify users,
                                check databases, and update records in real-time.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-start">
                                    <div className="w-10 h-10 rounded-full bg-surf-light/20 flex items-center justify-center text-surf-dark mr-4 shrink-0">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Easy Customization</h4>
                                        <p className="text-gray-600">Modify the flow logic in minutes using our visual builder.</p>
                                    </div>
                                </div>
                                <div className="flex items-start">
                                    <div className="w-10 h-10 rounded-full bg-surf-light/20 flex items-center justify-center text-surf-dark mr-4 shrink-0">
                                        <Check className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-gray-900">Enterprise Security</h4>
                                        <p className="text-gray-600">Data encryption and compliance built-in.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-dark-navy text-white text-center">
                <div className="container mx-auto px-4">
                    <h2 className="text-3xl font-bold mb-6">Ready to launch your {template.title}?</h2>
                    <button className="px-10 py-5 bg-surf hover:bg-surf-dark text-white rounded-full font-bold text-xl shadow-lg shadow-surf/30 transition-all hover:scale-105">
                        Start Free Trial
                    </button>
                    <p className="mt-4 text-gray-400 text-sm">No credit card required • 14-day free trial</p>
                </div>
            </section>

            <Footer />
        </main>
    );
}
