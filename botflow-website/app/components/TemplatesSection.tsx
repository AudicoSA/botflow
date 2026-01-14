
'use client';

import { templates } from '@/lib/templatesData';
import LandingTemplateCard from './LandingTemplateCard';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function TemplatesSection() {
    return (
        <section id="templates" className="py-24 bg-gradient-to-b from-white to-surf-light/10 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-0 w-96 h-96 bg-surf-light/20 rounded-full blur-3xl -translate-x-1/2"></div>
                <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-sunset-pink/20 rounded-full blur-3xl translate-x-1/2"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-4xl md:text-5xl font-bold mb-6 text-dark-navy">
                        Choose Your <span className="gradient-text">Automation</span> Flavor
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Get started instantly with our pre-built specialized bots.
                        Designed for specific industries, ready to deploy.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {templates.slice(0, 6).map((template, index) => (
                        <LandingTemplateCard key={template.slug} template={template} index={index} />
                    ))}
                </div>

                <div className="mt-16 text-center">
                    <Link
                        href="/templates"
                        className="inline-flex items-center px-8 py-4 bg-white border-2 border-surf text-surf-dark rounded-full font-bold text-lg hover:bg-surf hover:text-white hover:border-surf transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 group"
                    >
                        View All Application Templates
                        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
