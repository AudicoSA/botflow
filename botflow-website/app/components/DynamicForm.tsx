'use client';

import { useState } from 'react';

/**
 * Field definition from template JSON
 */
interface FieldDefinition {
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'time' | 'json';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  helpText?: string;
  defaultValue?: any;
}

interface DynamicFormProps {
  fields: Record<string, FieldDefinition>;
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
}

export function DynamicForm({ fields, values, onChange, errors }: DynamicFormProps) {
  return (
    <div className="space-y-6">
      {Object.entries(fields).map(([fieldName, fieldDef]) => (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {fieldDef.label}
            {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {renderField(fieldName, fieldDef, values[fieldName], onChange, errors[fieldName])}

          {fieldDef.helpText && (
            <p className="text-sm text-gray-500">{fieldDef.helpText}</p>
          )}

          {errors[fieldName] && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span>
              {errors[fieldName]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Render appropriate input based on field type
 */
function renderField(
  fieldName: string,
  fieldDef: FieldDefinition,
  value: any,
  onChange: (fieldName: string, value: any) => void,
  error?: string
) {
  const baseInputClasses = `w-full border rounded-lg px-4 py-2 transition ${
    error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  } focus:outline-none focus:ring-2`;

  switch (fieldDef.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder}
          className={baseInputClasses}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder}
          rows={4}
          className={baseInputClasses}
        />
      );

    case 'number':
      return (
        <div className="relative">
          <input
            type="number"
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
              onChange(fieldName, val);
            }}
            placeholder={fieldDef.placeholder}
            min={fieldDef.validation?.min}
            max={fieldDef.validation?.max}
            className={baseInputClasses}
          />
          {(fieldDef.validation?.min !== undefined || fieldDef.validation?.max !== undefined) && (
            <p className="text-xs text-gray-500 mt-1">
              {fieldDef.validation.min !== undefined && `Min: ${fieldDef.validation.min}`}
              {fieldDef.validation.min !== undefined && fieldDef.validation.max !== undefined && ' • '}
              {fieldDef.validation.max !== undefined && `Max: ${fieldDef.validation.max}`}
            </p>
          )}
        </div>
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          className={baseInputClasses}
        >
          <option value="">-- Select an option --</option>
          {fieldDef.validation?.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-gray-50">
          {fieldDef.validation?.options?.map((option) => {
            const isChecked = Array.isArray(value) && value.includes(option);

            return (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const currentValue = Array.isArray(value) ? value : [];
                    const newValue = e.target.checked
                      ? [...currentValue, option]
                      : currentValue.filter((v) => v !== option);
                    onChange(fieldName, newValue);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            );
          })}
          {(!fieldDef.validation?.options || fieldDef.validation.options.length === 0) && (
            <p className="text-sm text-gray-500">No options available</p>
          )}
        </div>
      );

    case 'time':
      // Time picker - for now use text input
      // TODO: Implement proper time picker in future
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder || 'e.g., 9:00 AM - 5:00 PM'}
          className={baseInputClasses}
        />
      );

    case 'json':
      // JSON input - use textarea with validation
      // TODO: Add JSON syntax highlighting in future
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder || 'Enter valid JSON'}
          rows={6}
          className={`${baseInputClasses} font-mono text-sm`}
        />
      );

    default:
      return (
        <div className="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded p-3">
          Unsupported field type: {fieldDef.type}
        </div>
      );
  }
}
