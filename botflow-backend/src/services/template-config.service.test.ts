import { describe, it, expect } from 'vitest';
import { extractVariables, replaceVariables } from './template-config.service.js';

describe('Template Config Service', () => {
  describe('replaceVariables', () => {
    it('should replace single variable', () => {
      const text = 'Hello {{name}}!';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Hello John!');
    });

    it('should replace multiple different variables', () => {
      const text = '{{business_name}} operates in {{service_area}}';
      const variables = {
        business_name: 'Cape Town Cabs',
        service_area: 'Cape Town CBD'
      };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Cape Town Cabs operates in Cape Town CBD');
    });

    it('should replace same variable multiple times', () => {
      const text = '{{name}} is {{name}}';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('John is John');
    });

    it('should handle missing variables gracefully', () => {
      const text = 'Hello {{name}}! Welcome to {{place}}.';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Hello John! Welcome to {{place}}.');
    });

    it('should handle empty text', () => {
      const text = '';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('');
    });

    it('should handle text with no variables', () => {
      const text = 'Hello World!';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Hello World!');
    });

    it('should handle variables with special characters in values', () => {
      const text = 'Email: {{email}}';
      const variables = { email: 'test@example.com' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Email: test@example.com');
    });

    it('should handle numbers in variable names', () => {
      const text = 'Rate: R{{base_rate}}/km: R{{per_km_rate}}';
      const variables = {
        base_rate: '50',
        per_km_rate: '12'
      };
      const result = replaceVariables(text, variables);
      expect(result).toBe('Rate: R50/km: R12');
    });

    it('should handle underscores in variable names', () => {
      const text = '{{business_name}} - {{operating_hours}}';
      const variables = {
        business_name: 'My Business',
        operating_hours: '24/7'
      };
      const result = replaceVariables(text, variables);
      expect(result).toBe('My Business - 24/7');
    });

    it('should not replace partial matches', () => {
      const text = '{{name}} and {{username}}';
      const variables = { name: 'John' };
      const result = replaceVariables(text, variables);
      expect(result).toBe('John and {{username}}');
    });
  });

  describe('extractVariables', () => {
    it('should convert string values', () => {
      const fieldValues = {
        business_name: 'Cape Town Cabs',
        service_area: 'Cape Town CBD'
      };
      const result = extractVariables(fieldValues);
      expect(result.business_name).toBe('Cape Town Cabs');
      expect(result.service_area).toBe('Cape Town CBD');
    });

    it('should convert array to comma-separated string', () => {
      const fieldValues = {
        vehicle_types: ['Sedan', 'SUV', 'Van']
      };
      const result = extractVariables(fieldValues);
      expect(result.vehicle_types).toBe('Sedan, SUV, Van');
    });

    it('should convert empty array to empty string', () => {
      const fieldValues = {
        vehicle_types: []
      };
      const result = extractVariables(fieldValues);
      expect(result.vehicle_types).toBe('');
    });

    it('should convert single-item array correctly', () => {
      const fieldValues = {
        vehicle_types: ['Sedan']
      };
      const result = extractVariables(fieldValues);
      expect(result.vehicle_types).toBe('Sedan');
    });

    it('should handle null values as empty strings', () => {
      const fieldValues = {
        optional_field: null
      };
      const result = extractVariables(fieldValues);
      expect(result.optional_field).toBe('');
    });

    it('should handle undefined values as empty strings', () => {
      const fieldValues = {
        missing_field: undefined
      };
      const result = extractVariables(fieldValues);
      expect(result.missing_field).toBe('');
    });

    it('should convert numbers to strings', () => {
      const fieldValues = {
        base_rate: 50,
        per_km_rate: 12.5,
        zero_value: 0
      };
      const result = extractVariables(fieldValues);
      expect(result.base_rate).toBe('50');
      expect(result.per_km_rate).toBe('12.5');
      expect(result.zero_value).toBe('0');
    });

    it('should convert boolean to string', () => {
      const fieldValues = {
        is_active: true,
        is_verified: false
      };
      const result = extractVariables(fieldValues);
      expect(result.is_active).toBe('true');
      expect(result.is_verified).toBe('false');
    });

    it('should convert object to JSON string', () => {
      const fieldValues = {
        pricing_config: {
          base: 50,
          per_km: 12
        }
      };
      const result = extractVariables(fieldValues);
      expect(result.pricing_config).toBe('{"base":50,"per_km":12}');
    });

    it('should handle mixed types', () => {
      const fieldValues = {
        business_name: 'Cape Town Cabs',
        vehicle_types: ['Sedan', 'SUV'],
        base_rate: 50,
        per_km_rate: 12.5,
        is_active: true,
        optional_field: null,
        pricing_config: { base: 50 }
      };
      const result = extractVariables(fieldValues);
      expect(result.business_name).toBe('Cape Town Cabs');
      expect(result.vehicle_types).toBe('Sedan, SUV');
      expect(result.base_rate).toBe('50');
      expect(result.per_km_rate).toBe('12.5');
      expect(result.is_active).toBe('true');
      expect(result.optional_field).toBe('');
      expect(result.pricing_config).toBe('{"base":50}');
    });

    it('should handle empty object', () => {
      const fieldValues = {};
      const result = extractVariables(fieldValues);
      expect(result).toEqual({});
    });

    it('should handle arrays with mixed types', () => {
      const fieldValues = {
        mixed_array: ['text', 123, true]
      };
      const result = extractVariables(fieldValues);
      expect(result.mixed_array).toBe('text, 123, true');
    });
  });

  describe('integration - replaceVariables with extractVariables', () => {
    it('should work together for complete variable replacement', () => {
      const fieldValues = {
        business_name: 'Cape Town Cabs',
        service_area: 'Cape Town CBD',
        vehicle_types: ['Sedan (4 seater)', 'SUV (6 seater)'],
        pricing_model: 'Per kilometer',
        base_rate: 50,
        per_km_rate: 12,
        operating_hours: '24/7',
        booking_phone: '021 123 4567'
      };

      const template = `You are a helpful taxi booking assistant for {{business_name}}.

Service Area: {{service_area}}
Vehicle Types: {{vehicle_types}}
Pricing: {{pricing_model}} - Base: R{{base_rate}}, Per km: R{{per_km_rate}}
Operating Hours: {{operating_hours}}
Booking Phone: {{booking_phone}}`;

      const variables = extractVariables(fieldValues);
      const result = replaceVariables(template, variables);

      expect(result).toContain('Cape Town Cabs');
      expect(result).toContain('Cape Town CBD');
      expect(result).toContain('Sedan (4 seater), SUV (6 seater)');
      expect(result).toContain('Per kilometer');
      expect(result).toContain('Base: R50');
      expect(result).toContain('Per km: R12');
      expect(result).toContain('24/7');
      expect(result).toContain('021 123 4567');
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');
    });

    it('should handle real taxi template system prompt', () => {
      const fieldValues = {
        business_name: 'Cape Town Cabs',
        service_area: 'Cape Town CBD and surrounding areas',
        vehicle_types: ['Sedan (4 seater)', 'SUV (6 seater)'],
        pricing_model: 'Per kilometer',
        base_rate: 50,
        per_km_rate: 12,
        operating_hours: '24/7',
        booking_phone: '021 123 4567'
      };

      const systemPrompt = `You are a helpful taxi booking assistant for {{business_name}}. You help customers:
1. Book rides
2. Get price quotes
3. Confirm pickup locations and times
4. Answer questions about service areas and vehicle types

Service Area: {{service_area}}
Vehicle Types: {{vehicle_types}}
Pricing: {{pricing_model}} - Base: R{{base_rate}}, Per km: R{{per_km_rate}}
Operating Hours: {{operating_hours}}
Booking Phone: {{booking_phone}}

Always be professional, friendly, and efficient.`;

      const variables = extractVariables(fieldValues);
      const result = replaceVariables(systemPrompt, variables);

      // Should not contain any placeholders
      expect(result).not.toContain('{{');
      expect(result).not.toContain('}}');

      // Should contain all values
      expect(result).toContain('Cape Town Cabs');
      expect(result).toContain('Cape Town CBD and surrounding areas');
      expect(result).toContain('Sedan (4 seater), SUV (6 seater)');
      expect(result).toContain('R50');
      expect(result).toContain('R12');
    });
  });
});
