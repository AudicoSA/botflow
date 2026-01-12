'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicForm } from '@/app/components/DynamicForm';
import { validateFieldValues } from '@/app/utils/formValidation';

export default function TemplateSetupPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  // State
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [botName, setBotName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/templates/${templateId}`
      );

      if (!response.ok) {
        throw new Error('Template not found');
      }

      const data = await response.json();
      setTemplate(data.template);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      alert('Failed to load template. Redirecting...');
      router.push('/dashboard/templates');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate bot name
      if (!botName.trim()) {
        newErrors.botName = 'Bot name is required';
      } else if (botName.trim().length < 3) {
        newErrors.botName = 'Bot name must be at least 3 characters';
      } else if (botName.trim().length > 50) {
        newErrors.botName = 'Bot name must be less than 50 characters';
      }
    }

    if (step === 2) {
      // Validate field values using our validation helper
      const fieldErrors = validateFieldValues(template.required_fields, fieldValues);
      Object.assign(newErrors, fieldErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleCreateBot = async () => {
    if (!validateStep()) return;

    setCreating(true);
    setErrors({});

    try {
      // Get auth token from localStorage
      // NOTE: Adjust this based on your auth implementation
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get user context (org and whatsapp account)
      // NOTE: Replace these with actual values from your user context
      const organizationId = localStorage.getItem('organizationId');
      const whatsappAccountId = localStorage.getItem('whatsappAccountId');

      if (!organizationId || !whatsappAccountId) {
        throw new Error('Missing organization or WhatsApp account. Please complete setup first.');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/create-from-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            template_id: templateId,
            organization_id: organizationId,
            whatsapp_account_id: whatsappAccountId,
            bot_name: botName,
            field_values: fieldValues,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bot');
      }

      const data = await response.json();

      // Redirect to bot detail page with success message
      router.push(`/dashboard/bots/${data.bot.id}?created=true`);
    } catch (error: any) {
      console.error('Failed to create bot:', error);
      setErrors({
        submit: error.message || 'Failed to create bot. Please try again.'
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Set Up Your Bot</h1>
        <p className="text-gray-600">
          Template: <span className="font-semibold">{template.name}</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Name' },
            { num: 2, label: 'Configure' },
            { num: 3, label: 'Review' },
          ].map((s, index) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step > s.num
                      ? 'bg-green-600 text-white'
                      : step === s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="text-xs mt-1 text-gray-600">{s.label}</span>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s.num ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Name Your Bot</h2>
            <p className="text-gray-600 text-sm mb-6">
              Choose a name that helps you identify this bot in your dashboard.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bot Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => {
                  setBotName(e.target.value);
                  if (errors.botName) {
                    setErrors({ ...errors, botName: '' });
                  }
                }}
                placeholder="e.g., My Taxi Service Bot"
                className={`w-full border rounded-lg px-4 py-3 ${
                  errors.botName
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none focus:ring-2`}
                autoFocus
              />
              {errors.botName && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  {errors.botName}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {botName.length}/50 characters
              </p>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <p className="font-semibold text-blue-900">{template.name}</p>
                  <p className="text-sm text-blue-700">{template.tagline}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Configure Your Bot</h2>
            <p className="text-gray-600 text-sm mb-6">
              Provide details about your business so your bot can assist customers effectively.
            </p>

            <DynamicForm
              fields={template.required_fields}
              values={fieldValues}
              onChange={(fieldName, value) => {
                setFieldValues({ ...fieldValues, [fieldName]: value });
                // Clear error for this field
                if (errors[fieldName]) {
                  const newErrors = { ...errors };
                  delete newErrors[fieldName];
                  setErrors(newErrors);
                }
              }}
              errors={errors}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Review & Create</h2>
            <p className="text-gray-600 text-sm mb-6">
              Please review your configuration before creating the bot.
            </p>

            <div className="space-y-6">
              {/* Bot Name */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Bot Name</h3>
                <p className="text-gray-900">{botName}</p>
              </div>

              {/* Template */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Template</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="text-gray-900">{template.name}</span>
                </div>
              </div>

              {/* Configuration */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Configuration</h3>
                <div className="space-y-2">
                  {Object.entries(fieldValues).map(([key, value]) => {
                    const fieldDef = template.required_fields[key];
                    if (!fieldDef) return null;

                    return (
                      <div
                        key={key}
                        className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="text-gray-600 text-sm font-medium">
                          {fieldDef.label}:
                        </span>
                        <span className="text-gray-900 text-sm text-right max-w-xs">
                          {Array.isArray(value)
                            ? value.join(', ')
                            : value?.toString() || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {errors.submit && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <span className="text-red-600">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">Error Creating Bot</p>
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleCreateBot}
              disabled={creating}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Create Bot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
