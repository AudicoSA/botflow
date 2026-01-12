interface FieldDefinition {
  type: string;
  label: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

/**
 * Validate field values against template field definitions
 */
export function validateFieldValues(
  fields: Record<string, FieldDefinition>,
  values: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {};

  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    const value = values[fieldName];

    // Check required fields
    if (fieldDef.required) {
      if (value === undefined || value === null || value === '') {
        errors[fieldName] = `${fieldDef.label} is required`;
        return;
      }

      // For multiselect, check if array is empty
      if (fieldDef.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
        errors[fieldName] = `Please select at least one ${fieldDef.label.toLowerCase()}`;
        return;
      }
    }

    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Type-specific validation
    if (fieldDef.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors[fieldName] = `${fieldDef.label} must be a valid number`;
        return;
      }

      if (fieldDef.validation) {
        if (fieldDef.validation.min !== undefined && value < fieldDef.validation.min) {
          errors[fieldName] = `${fieldDef.label} must be at least ${fieldDef.validation.min}`;
          return;
        }
        if (fieldDef.validation.max !== undefined && value > fieldDef.validation.max) {
          errors[fieldName] = `${fieldDef.label} must be at most ${fieldDef.validation.max}`;
          return;
        }
      }
    }

    // Select validation
    if (fieldDef.type === 'select' && fieldDef.validation?.options) {
      if (!fieldDef.validation.options.includes(value)) {
        errors[fieldName] = `Invalid selection for ${fieldDef.label}`;
        return;
      }
    }

    // Multiselect validation
    if (fieldDef.type === 'multiselect' && fieldDef.validation?.options) {
      if (!Array.isArray(value)) {
        errors[fieldName] = `${fieldDef.label} must be an array`;
        return;
      }

      const invalidOptions = value.filter(v => !fieldDef.validation?.options?.includes(v));
      if (invalidOptions.length > 0) {
        errors[fieldName] = `Invalid selections: ${invalidOptions.join(', ')}`;
        return;
      }
    }

    // Pattern validation (for text fields)
    if (fieldDef.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(fieldDef.validation.pattern);
      if (!regex.test(value)) {
        errors[fieldName] = `${fieldDef.label} format is invalid`;
        return;
      }
    }
  });

  return errors;
}
