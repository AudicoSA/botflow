import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WizardState {
  wizardData: Record<string, any>;
  currentStep: number;
  blueprint: any | null;
  validationErrors: Record<string, string[]>;

  updateStepData: (step: string, data: any) => void;
  setCurrentStep: (step: number) => void;
  setBlueprint: (blueprint: any) => void;
  addValidationError: (step: string, errors: string[]) => void;
  clearValidationErrors: (step: string) => void;
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      wizardData: {},
      currentStep: 0,
      blueprint: null,
      validationErrors: {},

      updateStepData: (step, data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, [step]: data }
        })),

      setCurrentStep: (step) => set({ currentStep: step }),

      setBlueprint: (blueprint) => set({ blueprint }),

      addValidationError: (step, errors) =>
        set((state) => ({
          validationErrors: { ...state.validationErrors, [step]: errors }
        })),

      clearValidationErrors: (step) =>
        set((state) => {
          const newErrors = { ...state.validationErrors };
          delete newErrors[step];
          return { validationErrors: newErrors };
        }),

      resetWizard: () => set({
        wizardData: {},
        currentStep: 0,
        blueprint: null,
        validationErrors: {}
      })
    }),
    { name: 'botflow-wizard-storage' }
  )
);
