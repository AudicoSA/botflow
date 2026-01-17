'use client';

import { useState, useEffect } from 'react';
import { BotTemplate, TemplateField } from '@/app/types/template';
import { validateField, BotNameSchema } from '@/app/lib/validation';

interface TemplateCustomizerProps {
  templateId: string;
  data: {
    bot_name?: string;
    field_values?: Record<string, any>;
  };
  updateData: (data: any) => void;
}

export function TemplateCustomizer({ templateId, data, updateData }: TemplateCustomizerProps) {
  const [template, setTemplate] = useState<BotTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(data.field_values || {});

  useEffect(() => {
    if (templateId && templateId !== 'custom') {
      fetchTemplate();
    } else {
      setLoading(false);
    }
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${templateId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch template');
      }

      const result = await response.json();
      setTemplate(result.template);

      // Initialize field values with defaults
      const initialValues: Record<string, any> = {};
      Object.entries(result.template.required_fields).forEach(([key, field]: [string, any]) => {
        initialValues[key] = fieldValues[key] || field.defaultValue || '';
      });
      setFieldValues(initialValues);
    } catch (error) {
      console.error('Failed to fetch template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBotNameChange = (value: string) => {
    const validation = validateField(BotNameSchema, value);

    if (!validation.success && validation.error) {
      setErrors(prev => ({ ...prev, bot_name: validation.error! }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.bot_name;
        return newErrors;
      });
    }

    updateData({ ...data, bot_name: value, field_values: fieldValues });
  };

  const handleFieldChange = (fieldName: string, value: any, field: TemplateField) => {
    const newValues = { ...fieldValues, [fieldName]: value };
    setFieldValues(newValues);

    // Validate field
    const validation = validateFieldValue(value, field);
    if (!validation.success) {
      setErrors(prev => ({ ...prev, [fieldName]: validation.error! }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }

    updateData({ ...data, field_values: newValues });
  };

  const validateFieldValue = (value: any, field: TemplateField): { success: boolean; error?: string } => {
    if (field.required && (!value || value === '')) {
      return { success: false, error: `${field.label} is required` };
    }

    if (field.validation) {
      const { min, max, pattern, options } = field.validation;

      if (field.type === 'number' && typeof value === 'number') {
        if (min !== undefined && value < min) {
          return { success: false, error: `Minimum value is ${min}` };
        }
        if (max !== undefined && value > max) {
          return { success: false, error: `Maximum value is ${max}` };
        }
      }

      if (field.type === 'text' || field.type === 'textarea') {
        if (min !== undefined && value.length < min) {
          return { success: false, error: `Minimum length is ${min} characters` };
        }
        if (max !== undefined && value.length > max) {
          return { success: false, error: `Maximum length is ${max} characters` };
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return { success: false, error: 'Invalid format' };
        }
      }

      if ((field.type === 'select' || field.type === 'multiselect') && options) {
        if (field.type === 'select' && !options.includes(value)) {
          return { success: false, error: 'Invalid selection' };
        }
        if (field.type === 'multiselect' && Array.isArray(value)) {
          const invalidOptions = value.filter(v => !options.includes(v));
          if (invalidOptions.length > 0) {
            return { success: false, error: 'Invalid selection' };
          }
        }
      }
    }

    return { success: true };
  };

  const renderField = (fieldName: string, field: TemplateField) => {
    const value = fieldValues[fieldName] || '';
    const error = errors[fieldName];

    const commonClasses = `w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, field)}
            placeholder={field.placeholder}
            className={commonClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, field)}
            placeholder={field.placeholder}
            rows={4}
            className={commonClasses}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value), field)}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={commonClasses}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, field)}
            className={commonClasses}
          >
            <option value="">Select an option...</option>
            {field.validation?.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {field.validation?.options?.map(option => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option]
                      : currentValues.filter(v => v !== option);
                    handleFieldChange(fieldName, newValues, field);
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(fieldName, e.target.value, field)}
            className={commonClasses}
          />
        );

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleFieldChange(fieldName, parsed, field);
              } catch {
                handleFieldChange(fieldName, e.target.value, field);
              }
            }}
            placeholder={field.placeholder || '{ "key": "value" }'}
            rows={6}
            className={`${commonClasses} font-mono text-sm`}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Custom bot flow (no template)
  if (templateId === 'custom') {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Custom Bot Builder</h3>
          <p className="text-sm text-blue-700">
            You've chosen to build a custom bot. In the next steps, you'll use our conversational
            AI builder to create a bot tailored to your specific needs.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bot Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.bot_name || ''}
            onChange={(e) => handleBotNameChange(e.target.value)}
            placeholder="My Custom Bot"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.bot_name ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.bot_name && (
            <p className="text-sm text-red-600 mt-1">{errors.bot_name}</p>
          )}
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Template not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template Info */}
      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-4xl">{template.icon}</span>
        <div>
          <h3 className="font-bold text-lg">{template.name}</h3>
          <p className="text-sm text-gray-600">{template.description}</p>
        </div>
      </div>

      {/* Bot Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bot Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.bot_name || ''}
          onChange={(e) => handleBotNameChange(e.target.value)}
          placeholder={`My ${template.name}`}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.bot_name ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.bot_name && (
          <p className="text-sm text-red-600 mt-1">{errors.bot_name}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">
          Choose a memorable name for your bot
        </p>
      </div>

      {/* Dynamic Template Fields */}
      {Object.entries(template.required_fields).map(([fieldName, field]) => (
        <div key={fieldName}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(fieldName, field)}
          {errors[fieldName] && (
            <p className="text-sm text-red-600 mt-1">{errors[fieldName]}</p>
          )}
          {field.helpText && !errors[fieldName] && (
            <p className="text-sm text-gray-500 mt-1">{field.helpText}</p>
          )}
        </div>
      ))}

      {/* Example Prompts */}
      {template.example_prompts && template.example_prompts.length > 0 && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-semibold text-yellow-900 mb-2">Example Use Cases:</h4>
          <ul className="list-disc list-inside space-y-1">
            {template.example_prompts.map((prompt, index) => (
              <li key={index} className="text-sm text-yellow-800">
                {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
