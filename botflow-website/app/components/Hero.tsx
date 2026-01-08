'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
    return (
        <section className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
            {/* Background Wave Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/hero-wave.png"
                    alt="Tropical Wave Background"
                    fill
                    className="object-cover object-center"
                    priority
                />
                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-teal-900/90 via-teal-900/40 to-transparent"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="grid lg:grid-cols-2 gap-12 items-center">

                    {/* Left Column - Content */}
                    <div className="text-white space-y-8 animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2">
                            <span className="w-2 h-2 bg-surf-light rounded-full animate-pulse shadow-[0_0_10px_#90E0EF]"></span>
                            <span className="text-sm font-medium text-white tracking-wide">Beta Access Open</span>
                        </div>

                        <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight">
                            Ride the Wave of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-surf-light to-white drop-shadow-sm">
                                Automation
                            </span>
                        </h1>

                        <p className="text-xl text-gray-200 leading-relaxed max-w-lg">
                            Build intelligent WhatsApp agents in minutes. Let automation handle the tides while you catch the breaks.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link
                                href="#waitlist"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-surf-DEFAULT hover:bg-surf-dark text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-surf-light/50 hover:-translate-y-1 transition-all duration-300"
                            >
                                Start Surfing
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>

                            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-2xl font-bold text-lg transition-all duration-300">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Watch Demo
                            </button>
                        </div>

                        <div className="pt-8 flex items-center gap-4 text-gray-300">
                            <span>Trusted by beach clubs & businesses worldwide 🏖️</span>
                        </div>
                    </div>

                    {/* Right Column - Visual */}
                    <div className="relative hidden lg:block">
                        <div className="relative animate-bounce-slow">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-surf-light/30 blur-[100px] rounded-full"></div>

                            {/* Surf Bot Image */}
                            <Image
                                src="/surf-bot.png"
                                alt="Surfing Robot"
                                width={800}
                                height={800}
                                className="relative z-10 drop-shadow-2xl"
                                priority
                            />

                            {/* Floating Glass Cards */}
                            <div className="absolute -left-10 top-1/2 z-20 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl animate-pulse">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">🏄‍♂️</div>
                                    <div>
                                        <div className="text-xs text-surf-light font-bold uppercase tracking-wider">Speed</div>
                                        <span className="text-white font-bold">Max Velocity</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent z-20"></div>
        </section>
    );
}
