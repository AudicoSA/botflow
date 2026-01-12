'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className={`${styles[type]} border rounded-lg p-4 shadow-lg max-w-md`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{icons[type]}</span>
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
