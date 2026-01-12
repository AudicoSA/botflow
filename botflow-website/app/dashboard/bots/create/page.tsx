'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page is deprecated and redirects to the new template-based bot creation flow.
 * The new flow (/dashboard/templates) uses the database template system with 21 templates
 * instead of the old hardcoded 7 templates.
 */
export default function CreateBotPage() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to templates page which has the full template system
        router.replace('/dashboard/templates');
    }, [router]);

    // Show loading state while redirecting
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue mx-auto mb-4"></div>
                <p className="text-gray-600">Redirecting to templates...</p>
            </div>
        </div>
    );
}
