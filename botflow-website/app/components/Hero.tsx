'use client';

import Link from 'next/link';

export default function Hero() {
    return (
        <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-7xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left Column - Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2 mb-6">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-sm font-medium text-gray-700">Now accepting beta customers</span>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
                            Automate Every<br />
                            <span className="gradient-text">WhatsApp Conversation</span>
                        </h1>

                        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                            Build AI-powered service agents in minutes. No coding required.<br />
                            Transform your customer experience with intelligent automation.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 mb-8">
                            <Link
                                href="#waitlist"
                                className="inline-flex items-center justify-center gap-2 px-8 py-4 gradient-bg text-white rounded-xl font-semibold text-lg hover:shadow-xl hover:-translate-y-1 transition-all"
                            >
                                Start Free Trial
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </Link>

                            <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-gray-300 text-gray-900 rounded-xl font-semibold text-lg hover:border-primary-blue transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Watch Demo
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                    </svg>
                                ))}
                            </div>
                            <span className="text-gray-600">Trusted by 100+ businesses</span>
                        </div>
                    </div>

                    {/* Right Column - Visual */}
                    <div className="relative">
                        <div className="relative bg-gradient-to-br from-primary-blue/10 to-primary-cyan/10 rounded-3xl p-8 backdrop-blur-sm">
                            {/* Phone Mockup */}
                            <div className="bg-gray-900 rounded-[3rem] p-3 shadow-2xl mx-auto max-w-sm">
                                <div className="bg-gradient-to-b from-[#E5DDD5] to-[#D9D0C8] rounded-[2.5rem] p-6 h-[600px] overflow-hidden">
                                    <div className="space-y-4">
                                        <div className="bg-white rounded-2xl rounded-bl-sm p-4 max-w-[80%] shadow-sm">
                                            <p className="text-sm text-gray-800">Hi! I'd like to book a shuttle for tomorrow at 9am</p>
                                        </div>

                                        <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm p-4 max-w-[80%] ml-auto shadow-sm">
                                            <p className="text-sm text-gray-800">Perfect! I can help you with that. How many passengers?</p>
                                        </div>

                                        <div className="bg-white rounded-2xl rounded-bl-sm p-4 max-w-[80%] shadow-sm">
                                            <p className="text-sm text-gray-800">Just 2 people</p>
                                        </div>

                                        <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm p-4 max-w-[80%] ml-auto shadow-sm">
                                            <p className="text-sm text-gray-800">Great! What's the pickup location?</p>
                                        </div>

                                        <div className="bg-white rounded-2xl rounded-bl-sm p-4 max-w-[80%] shadow-sm">
                                            <p className="text-sm text-gray-800">St Francis Bay Hotel</p>
                                        </div>

                                        <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm p-4 max-w-[80%] ml-auto shadow-sm">
                                            <p className="text-sm text-gray-800">Perfect! Your shuttle is confirmed for tomorrow at 9:00 AM. 2 passengers from St Francis Bay Hotel. 🚐</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Floating Stats */}
                            <div className="absolute -left-4 top-20 bg-white rounded-2xl shadow-xl p-4 animate-bounce-slow">
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">⚡</div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-medium">Response Time</div>
                                        <div className="text-2xl font-bold gradient-text">&lt; 2 sec</div>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute -right-4 bottom-32 bg-white rounded-2xl shadow-xl p-4 animate-bounce-slow" style={{ animationDelay: '1.5s' }}>
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">📊</div>
                                    <div>
                                        <div className="text-xs text-gray-500 font-medium">Conversations</div>
                                        <div className="text-2xl font-bold gradient-text">+245%</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
