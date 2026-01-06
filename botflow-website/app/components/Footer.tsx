import Link from 'next/link';

export default function Footer() {
    return (
        <footer id="contact" className="bg-gray-900 text-white py-16 px-6">
            <div className="max-w-7xl mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-12">
                    {/* Brand */}
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-2xl font-bold">BotFlow</span>
                        </div>
                        <p className="text-gray-400 mb-4">Automate every conversation</p>
                        <p className="text-gray-500 text-sm">
                            Built with ❤️ in South Africa 🇿🇦
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
                        <ul className="space-y-3">
                            <li><Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link></li>
                            <li><Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Demo</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">About</Link></li>
                            <li><Link href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</Link></li>
                            <li><Link href="#" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © 2026 BotFlow. All rights reserved.
                    </p>
                    <div className="flex gap-6">
                        <Link href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Privacy</Link>
                        <Link href="#" className="text-gray-500 hover:text-white transition-colors text-sm">Terms</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
