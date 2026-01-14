
'use client';

import { templates } from '@/lib/templatesData';
import TemplateCard from './TemplateCard';
import { motion } from 'framer-motion';

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
                    {templates.map((template, index) => (
                        <TemplateCard key={template.slug} template={template} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
}
