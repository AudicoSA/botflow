'use client';

import { Template } from '@/lib/templatesData';
import { motion } from 'framer-motion';
import {
    ArrowRight, ShoppingBag, Headphones, Home, Calendar, Target, Users, Bot, Bus,
    Calculator, Wrench, Car, Sparkles, Stethoscope, Dumbbell, Building, Scale,
    Utensils, Scissors, Plane, GraduationCap, Heart
} from 'lucide-react';
import Link from 'next/link';

interface LandingTemplateCardProps {
    template: Template;
    index: number;
}

const icons: { [key: string]: any } = {
    ShoppingBag,
    Headphones,
    Home,
    Calendar,
    Target,
    Users,
    Bot,
    Bus,
    Calculator, Wrench, Car, Sparkles, Stethoscope, Dumbbell, Building, Scale,
    Utensils, Scissors, Plane, GraduationCap, Heart
};

export default function LandingTemplateCard({ template, index }: LandingTemplateCardProps) {
    const Icon = icons[template.icon] || Bot;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            viewport={{ once: true }}
            className="group relative"
        >
            <Link href={`/templates/${template.slug}`} className="block h-full">
                <div className="glass-card h-full p-8 rounded-2xl border border-white/50 bg-white/60 relative overflow-hidden transition-all duration-300 group-hover:-translate-y-2">

                    {/* Hover Gradient Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-surf-light/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-6 inline-flex p-3 rounded-xl bg-gradient-to-br from-surf to-surf-dark text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                            <Icon size={32} strokeWidth={1.5} />
                        </div>

                        <h3 className="text-2xl font-bold mb-3 text-dark-navy group-hover:text-surf-dark transition-colors">
                            {template.title}
                        </h3>

                        <p className="text-gray-600 mb-6 flex-grow leading-relaxed">
                            {template.shortDescription}
                        </p>

                        <div className="flex items-center text-surf-dark font-semibold group-hover:text-surf-darker transition-colors">
                            Explore Details <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}
