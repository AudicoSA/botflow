
'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface TemplateHeroProps {
    title: string;
    description: string;
    features: string[];
}

export default function TemplateHero({ title, description, features }: TemplateHeroProps) {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-surf-darker to-dark-navy text-white">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-surf/20 rounded-full blur-[100px] animate-float"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary-blue/20 rounded-full blur-[100px] animate-float" style={{ animationDelay: '2s' }}></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <Link href="/" className="inline-flex items-center text-surf-light hover:text-white mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
                </Link>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                            {title}
                        </h1>
                        <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                            {description}
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button className="px-8 py-4 bg-surf hover:bg-surf-dark text-white rounded-full font-bold shadow-lg shadow-surf/30 transition-all hover:scale-105">
                                Get This Bot
                            </button>
                            <button className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-bold backdrop-blur-md transition-all">
                                View Demo
                            </button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-8 shadow-2xl"
                    >
                        <h3 className="text-xl font-semibold mb-6 flex items-center">
                            <span className="w-8 h-1 bg-surf mr-3 rounded-full"></span>
                            Key Capabilities
                        </h3>
                        <ul className="space-y-4">
                            {features.map((feature, i) => (
                                <li key={i} className="flex items-start">
                                    <CheckCircle className="w-6 h-6 text-surf-light mr-3 flex-shrink-0" />
                                    <span className="text-gray-200">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
