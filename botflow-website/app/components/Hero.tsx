
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full h-screen overflow-hidden flex items-center justify-center">
      {/* Video Background */}
      <div className="absolute inset-0 w-full h-full z-0">
         <video
            autoPlay
            loop
            muted
            playsInline
            className="object-cover w-full h-full"
            poster="/hero-wave-new.jpg"
        >
            <source src="/waves.mp4" type="video/mp4" />
        </video>
        {/* Overlay for readability - using a gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-dark-navy/60 via-dark-navy/40 to-dark-navy/60 backdrop-blur-[2px]"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 relative text-center">
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
        >
             <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-white/30 bg-white/10 backdrop-blur-md">
                <span className="text-surf-light font-medium text-sm tracking-wide uppercase">The Future of WhatsApp Automation</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight text-shadow-lg">
                Ride the Wave of <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-surf-light to-white">Automated Success</span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-200 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
                Seamlessly integrate intelligent bots into your business. 
                From eCommerce to Support, we've got a template for you.
            </p>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link 
                    href="#templates" 
                    className="px-8 py-4 bg-surf hover:bg-surf-dark text-white rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-surf/50 flex items-center gap-2 group"
                >
                    Explore Templates
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform"/>
                </Link>
                
                <a 
                    href="/BotFlow__WhatsApp_Automation.mp4" 
                    target="_blank"
                    className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full font-bold text-lg transition-all duration-300 flex items-center gap-2 group"
                >
                    <div className="w-8 h-8 rounded-full bg-white text-surf-dark flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play fill="currentColor" className="w-4 h-4 ml-0.5" />
                    </div>
                    Watch Demo
                </a>
            </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/70"
      >
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center p-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
      </motion.div>
    </section>
  );
}
