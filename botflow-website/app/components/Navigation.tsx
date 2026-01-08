'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-surf-light/20 z-50 transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex justify-between items-center">

                    {/* Logo Section */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="relative w-40 h-12 hover:scale-105 transition-transform duration-300">
                            <Image
                                src="/logo_v2.png"
                                alt="BotFlow Logo"
                                fill
                                className="object-contain object-left"
                            />
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-gray-600 hover:text-surf-DEFAULT transition-colors font-medium">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-gray-600 hover:text-surf-DEFAULT transition-colors font-medium">
                            Pricing
                        </Link>
                        <Link href="#contact" className="text-gray-600 hover:text-surf-DEFAULT transition-colors font-medium">
                            Contact
                        </Link>

                        <Link
                            href="#waitlist"
                            className="px-6 py-2.5 bg-surf-DEFAULT hover:bg-surf-dark text-white rounded-xl font-semibold shadow-lg hover:shadow-surf-light/50 hover:-translate-y-0.5 transition-all"
                        >
                            Join Waitlist
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
