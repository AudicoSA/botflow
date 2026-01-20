'use client';

export function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-md text-center px-6">
        {/* Animated illustration */}
        <div className="relative mb-6">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center">
            <svg
              className="w-16 h-16 text-violet-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
              />
            </svg>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-4 right-1/4 w-3 h-3 bg-violet-200 rounded-full animate-pulse" />
          <div className="absolute bottom-6 left-1/4 w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          <div className="absolute top-1/2 right-1/3 w-2 h-2 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Your workflow will appear here
        </h3>
        <p className="text-gray-500 mb-6">
          Describe what you want your bot to do in the chat, and I'll build the workflow for you automatically.
        </p>

        {/* Examples */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-left">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Try saying something like:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-violet-500 mt-0.5">•</span>
              <span>"Track customer orders from my Shopify store"</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-violet-500 mt-0.5">•</span>
              <span>"Book appointments for my salon"</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-violet-500 mt-0.5">•</span>
              <span>"Answer FAQs about my restaurant menu"</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-600">
              <span className="text-violet-500 mt-0.5">•</span>
              <span>"Send payment links to customers"</span>
            </li>
          </ul>
        </div>

        {/* Tips */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>The more details you provide, the better the workflow</span>
        </div>
      </div>
    </div>
  );
}
