'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: '📊' },
        { name: 'Bots', href: '/dashboard/bots', icon: '🤖' },
        { name: 'Conversations', href: '/dashboard/conversations', icon: '💬' },
        { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
        { name: 'Integrations', href: '/dashboard/integrations', icon: '🔌' },
        { name: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 bg-white border-r border-gray-200 transition-all ${sidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
                        {sidebarOpen && (
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <span className="text-lg font-bold">BotFlow</span>
                            </div>
                        )}
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 rounded-lg hover:bg-gray-100"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                            ? 'bg-primary-blue text-white'
                                            : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User menu */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-blue to-primary-cyan flex items-center justify-center text-white font-semibold">
                                U
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">User</p>
                                    <p className="text-xs text-gray-500">Starter Plan</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className={`transition-all ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                {/* Top bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                            <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
