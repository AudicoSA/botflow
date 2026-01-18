'use client';

interface ValidationResultProps {
  result: {
    valid: boolean;
    message: string;
    details?: Record<string, any>;
  };
}

export function ValidationResult({ result }: ValidationResultProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        result.valid
          ? 'bg-green-50 border border-green-200'
          : 'bg-red-50 border border-red-200'
      }`}
    >
      <div className="flex items-center gap-2">
        {result.valid ? (
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )}
        <span className={result.valid ? 'text-green-800' : 'text-red-800'}>
          {result.message}
        </span>
      </div>

      {result.details && result.valid && (
        <div className="mt-2 text-sm text-green-700 space-y-1">
          {result.details.verified_via_api && (
            <p className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verified via API
            </p>
          )}
          {result.details.shop_name && (
            <p>Store: {result.details.shop_name}</p>
          )}
          {result.details.merchant_name && (
            <p>Merchant: {result.details.merchant_name}</p>
          )}
          {result.details.balance !== undefined && (
            <p>Balance: {result.details.balance}</p>
          )}
          {result.details.events_found !== undefined && (
            <p>Events found: {result.details.events_found}</p>
          )}
          {result.details.calendars_valid !== undefined && (
            <p>Valid calendars: {result.details.calendars_valid}</p>
          )}
        </div>
      )}

      {result.details && !result.valid && result.details.error && (
        <div className="mt-2 text-sm text-red-700">
          <p>Error: {result.details.error}</p>
        </div>
      )}
    </div>
  );
}
