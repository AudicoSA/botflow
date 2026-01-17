'use client';

import { useState } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  validate?: () => Promise<boolean>;
}

interface WizardContainerProps {
  steps: WizardStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
}

export function WizardContainer({
  steps,
  onComplete,
  onCancel
}: WizardContainerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Record<string, any>>({});
  const [isValidating, setIsValidating] = useState(false);

  const handleNext = async () => {
    const step = steps[currentStep];

    if (step.validate) {
      setIsValidating(true);
      const isValid = await step.validate();
      setIsValidating(false);

      if (!isValid) return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (stepData: any) => {
    setWizardData(prev => ({
      ...prev,
      [steps[currentStep].id]: stepData
    }));
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={`
              px-4 py-2 rounded-lg text-sm whitespace-nowrap
              ${index === currentStep
                ? 'bg-blue-600 text-white'
                : index < currentStep
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {index < currentStep && '✓ '}
            {step.title}
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {steps[currentStep].title}
        </h2>
        {steps[currentStep].description && (
          <p className="text-gray-600 mb-6">
            {steps[currentStep].description}
          </p>
        )}

        <CurrentStepComponent
          data={wizardData[steps[currentStep].id] || {}}
          updateData={updateData}
          allData={wizardData}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              disabled={isValidating}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isValidating}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isValidating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isValidating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </>
            ) : (
              <>
                {currentStep < steps.length - 1 ? 'Continue' : 'Create Bot'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
