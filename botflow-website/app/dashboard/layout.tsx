'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
    const [userEmail, setUserEmail] = useState('');
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Get user email from localStorage
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('botflow_token');
            if (token) {
                try {
                    // Decode JWT to get email
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    setUserEmail(payload.email || 'User');
                } catch (e) {
                    setUserEmail('User');
                }
            }
        }

        // Check if desktop and open sidebar by default
        const handleResize = () => {
            const isDesktopView = window.innerWidth >= 1024;
            setIsDesktop(isDesktopView);
            if (isDesktopView) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.clear();
            router.push('/login');
        }
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊' },
        { name: 'Bots', href: '/dashboard/bots', icon: '🤖' },
        { name: 'Templates', href: '/dashboard/templates', icon: '📋' },
        { name: 'Conversations', href: '/dashboard/conversations', icon: '💬' },
        { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
        { name: 'Integrations', href: '/dashboard/integrations', icon: '🔌' },
        { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out w-64
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                        {(sidebarOpen || isDesktop) && (
                            <div className="flex items-center gap-3">
                                <div className="relative w-auto h-[2.75rem] min-w-[108px] rounded-lg flex items-center justify-start">
                                    <Image
                                        src="/logo.png"
                                        alt="BotFlow Logo"
                                        fill
                                        className="object-contain object-left"
                                        priority
                                    />
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => {
                                        // Close sidebar on mobile after clicking
                                        if (!isDesktop) {
                                            setSidebarOpen(false);
                                        }
                                    }}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary-blue text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User menu */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold flex-shrink-0">
                                {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 lg:hidden">
                                <p className="text-sm font-medium text-gray-900 truncate">{userEmail || 'User'}</p>
                                <p className="text-xs text-gray-500">Starter Plan</p>
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 hidden lg:block">
                                    <p className="text-sm font-medium text-gray-900 truncate">{userEmail || 'User'}</p>
                                    <p className="text-xs text-gray-500">Starter Plan</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2 lg:hidden"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                        </button>
                        {sidebarOpen && (
                            <button
                                onClick={handleLogout}
                                className="w-full hidden lg:flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all lg:ml-20 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">
                            {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                            <svg className="w-5 h-5 lg:w-6 lg:h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
