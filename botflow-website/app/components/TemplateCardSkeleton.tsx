export function TemplateCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded"></div>
        <div className="w-16 h-6 bg-gray-200 rounded"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
  );
}
