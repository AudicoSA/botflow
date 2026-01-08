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
                {/* Gradient Overlay for Text Readability - Darkened as requested */}
                <div className="absolute inset-0 bg-gradient-to-r from-teal-900/95 via-teal-900/70 to-transparent"></div>
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

                    {/* Right Column - Visual (Phone Mockup - RESTORED) */}
                    <div className="relative hidden lg:block h-[600px] w-full flex items-center justify-center">
                        <div className="relative animate-bounce-slow">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-surf-light/20 blur-[80px] rounded-full"></div>

                            {/* Phone Mockup Frame */}
                            <div className="relative z-10 bg-gray-900 rounded-[3rem] border-8 border-gray-900 shadow-2xl w-[320px] h-[640px] mx-auto overflow-hidden ring-1 ring-white/10">
                                {/* Status Bar */}
                                <div className="h-6 bg-gray-900 w-full absolute top-0 left-0 z-20 rounded-t-[2.5rem]"></div>

                                {/* WhatsApp UI Header */}
                                <div className="bg-[#075E54] p-4 pt-8 text-white flex items-center gap-3 shadow-md relative z-10">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">BotFlow Agent</p>
                                        <p className="text-xs text-green-100">Online</p>
                                    </div>
                                </div>

                                {/* Chat Screen */}
                                <div className="bg-[#E5DDD5] h-full p-4 space-y-4 pt-4 overflow-hidden relative">
                                    {/* Default WhatsApp Background pattern - using a CSS pattern or simple opacity */}
                                    <div className="absolute inset-0 opacity-5 bg-black" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>

                                    <div className="relative bg-white rounded-lg p-3 max-w-[85%] shadow-sm self-start rounded-tl-none animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                        <p className="text-sm text-gray-800">Hi! I'd like to book a shuttle for tomorrow at 9am 🚐</p>
                                        <span className="text-[10px] text-gray-400 block text-right mt-1">09:41 AM</span>
                                    </div>

                                    <div className="relative bg-[#DCF8C6] rounded-lg p-3 max-w-[85%] ml-auto shadow-sm rounded-tr-none animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
                                        <p className="text-sm text-gray-800">Perfect! I can help with that. How many passengers?</p>
                                        <span className="text-[10px] text-[#075E54]/60 block text-right mt-1">09:41 AM</span>
                                    </div>

                                    <div className="relative bg-white rounded-lg p-3 max-w-[85%] shadow-sm self-start rounded-tl-none animate-fade-in-up" style={{ animationDelay: '1.5s' }}>
                                        <p className="text-sm text-gray-800">Just 2 people.</p>
                                        <span className="text-[10px] text-gray-400 block text-right mt-1">09:42 AM</span>
                                    </div>

                                    <div className="relative bg-[#DCF8C6] rounded-lg p-3 max-w-[85%] ml-auto shadow-sm rounded-tr-none animate-fade-in-up" style={{ animationDelay: '2.2s' }}>
                                        <p className="text-sm text-gray-800">Great! What is the pickup location? 📍</p>
                                        <span className="text-[10px] text-[#075E54]/60 block text-right mt-1">09:42 AM</span>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Stats Cards (Glassmorphism) */}
                            <div className="absolute -left-12 top-1/3 z-30 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl animate-bounce-slow">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">⚡</div>
                                    <div>
                                        <div className="text-xs text-surf-light font-bold uppercase tracking-wider">Response Time</div>
                                        <div className="text-xl font-bold text-white">&lt; 2 sec</div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -right-8 bottom-1/4 z-30 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-xl animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">📊</div>
                                    <div>
                                        <div className="text-xs text-surf-light font-bold uppercase tracking-wider">Conversations</div>
                                        <div className="text-xl font-bold text-white">+245%</div>
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
