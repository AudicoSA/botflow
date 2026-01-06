'use client';

import Link from 'next/link';

export default function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-200 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-gray-900">BotFlow</span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-gray-700 hover:text-primary-blue transition-colors font-medium">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-gray-700 hover:text-primary-blue transition-colors font-medium">
                            Pricing
                        </Link>
                        <Link href="#contact" className="text-gray-700 hover:text-primary-blue transition-colors font-medium">
                            Contact
                        </Link>
                        <Link
                            href="#waitlist"
                            className="px-6 py-2.5 gradient-bg text-white rounded-lg font-semibold hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            Join Waitlist
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
