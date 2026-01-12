import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildMessagesArray,
  matchIntent,
  enhancePromptWithIntent,
  validateMessagesArray
} from './prompt-builder.service.js';
import { TemplateConfig } from './template-config.service.js';

describe('Prompt Builder Service', () => {
  // Mock template configuration for testing
  const mockConfig: TemplateConfig = {
    botId: 'test-bot-123',
    botName: 'Test Taxi Bot',
    templateId: 'taxi-template',
    conversationFlow: {
      systemPrompt: 'You are a helpful assistant for {{business_name}}. We operate in {{service_area}}.',
      welcomeMessage: 'Hello! Welcome to {{business_name}}.',
      rules: [
        'Always be polite',
        'Confirm details before booking',
        'Ask for pickup location'
      ],
      intents: {
        book_ride: {
          triggers: ['book', 'need a ride', 'pickup'],
          response: 'Collect pickup location, destination, time, and passengers'
        },
        get_quote: {
          triggers: ['how much', 'price', 'cost'],
          response: 'Ask for pickup and destination to calculate fare'
        }
      },
      handoffConditions: ['customer is angry']
    },
    fieldValues: {
      business_name: 'Cape Town Cabs',
      service_area: 'Cape Town CBD'
    },
    variables: {
      business_name: 'Cape Town Cabs',
      service_area: 'Cape Town CBD'
    }
  };

  describe('buildSystemPrompt', () => {
    it('should include system prompt with variables replaced', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('Cape Town Cabs');
      expect(prompt).toContain('Cape Town CBD');
      expect(prompt).not.toContain('{{business_name}}');
      expect(prompt).not.toContain('{{service_area}}');
    });

    it('should include all rules as numbered list', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('## Important Rules:');
      expect(prompt).toContain('1. Always be polite');
      expect(prompt).toContain('2. Confirm details before booking');
      expect(prompt).toContain('3. Ask for pickup location');
    });

    it('should include intent definitions', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('## Intent Recognition:');
      expect(prompt).toContain('Book Ride');
      expect(prompt).toContain('book, need a ride, pickup');
      expect(prompt).toContain('Collect pickup location');
    });

    it('should include current conversation section', () => {
      const prompt = buildSystemPrompt(mockConfig);
      expect(prompt).toContain('## Current Conversation:');
      expect(prompt).toContain('conversation history');
    });

    it('should handle config with no rules', () => {
      const configNoRules = {
        ...mockConfig,
        conversationFlow: {
          ...mockConfig.conversationFlow,
          rules: []
        }
      };
      const prompt = buildSystemPrompt(configNoRules);
      expect(prompt).not.toContain('## Important Rules:');
      expect(prompt).toContain('Cape Town Cabs');
    });

    it('should handle config with no intents', () => {
      const configNoIntents = {
        ...mockConfig,
        conversationFlow: {
          ...mockConfig.conversationFlow,
          intents: {}
        }
      };
      const prompt = buildSystemPrompt(configNoIntents);
      expect(prompt).not.toContain('## Intent Recognition:');
      expect(prompt).toContain('Cape Town Cabs');
    });

    it('should format intent names correctly', () => {
      const prompt = buildSystemPrompt(mockConfig);
      // book_ride should become "Book Ride"
      expect(prompt).toContain('Book Ride');
      // get_quote should become "Get Quote"
      expect(prompt).toContain('Get Quote');
    });
  });

  describe('buildMessagesArray', () => {
    const mockHistory = [
      { role: 'user', content: 'Hello', created_at: '2024-01-01T10:00:00Z' },
      { role: 'assistant', content: 'Hi! How can I help?', created_at: '2024-01-01T10:00:01Z' },
      { role: 'customer', content: 'I need a taxi', created_at: '2024-01-01T10:00:02Z' },
      { role: 'assistant', content: 'Sure! Where from?', created_at: '2024-01-01T10:00:03Z' }
    ];

    it('should create messages array with correct structure', () => {
      const messages = buildMessagesArray(mockConfig, mockHistory, 'From Main Street');

      expect(messages).toHaveLength(6); // 1 system + 4 history + 1 current
      expect(messages[0].role).toBe('system');
      expect(messages[messages.length - 1].role).toBe('user');
      expect(messages[messages.length - 1].content).toBe('From Main Street');
    });

    it('should include system prompt as first message', () => {
      const messages = buildMessagesArray(mockConfig, mockHistory, 'Test message');

      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toContain('Cape Town Cabs');
    });

    it('should convert customer role to user', () => {
      const messages = buildMessagesArray(mockConfig, mockHistory, 'Test');

      const customerMsg = messages.find(m => m.content === 'I need a taxi');
      expect(customerMsg?.role).toBe('user');
    });

    it('should handle empty history', () => {
      const messages = buildMessagesArray(mockConfig, [], 'First message');

      expect(messages).toHaveLength(2); // system + current
      expect(messages[0].role).toBe('system');
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('First message');
    });

    it('should limit history to last 10 messages', () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        created_at: new Date().toISOString()
      }));

      const messages = buildMessagesArray(mockConfig, longHistory, 'Current');

      // 1 system + 10 history + 1 current = 12
      expect(messages).toHaveLength(12);
    });

    it('should preserve message order', () => {
      const messages = buildMessagesArray(mockConfig, mockHistory, 'New message');

      // Check order after system message
      expect(messages[1].content).toBe('Hello');
      expect(messages[2].content).toBe('Hi! How can I help?');
      expect(messages[3].content).toBe('I need a taxi');
      expect(messages[4].content).toBe('Sure! Where from?');
      expect(messages[5].content).toBe('New message');
    });
  });

  describe('matchIntent', () => {
    it('should match book_ride intent', () => {
      const message = 'I need to book a ride to the airport';
      const match = matchIntent(message, mockConfig);

      expect(match).not.toBeNull();
      expect(match?.name).toBe('book_ride');
      expect(match?.response).toContain('Collect pickup location');
    });

    it('should match get_quote intent', () => {
      const message = 'How much does it cost to go to Camps Bay?';
      const match = matchIntent(message, mockConfig);

      expect(match).not.toBeNull();
      expect(match?.name).toBe('get_quote');
      expect(match?.response).toContain('calculate fare');
    });

    it('should return null for no match', () => {
      const message = 'What is your phone number?';
      const match = matchIntent(message, mockConfig);

      expect(match).toBeNull();
    });

    it('should be case insensitive', () => {
      const message = 'I NEED TO BOOK A RIDE';
      const match = matchIntent(message, mockConfig);

      expect(match).not.toBeNull();
      expect(match?.name).toBe('book_ride');
    });

    it('should match partial trigger words', () => {
      const message = 'Can I pickup from Main Street?';
      const match = matchIntent(message, mockConfig);

      expect(match).not.toBeNull();
      expect(match?.name).toBe('book_ride');
    });

    it('should return first matched intent', () => {
      // "book" appears in both triggers but book_ride is defined first
      const message = 'I want to book';
      const match = matchIntent(message, mockConfig);

      expect(match?.name).toBe('book_ride');
    });

    it('should handle config with no intents', () => {
      const configNoIntents = {
        ...mockConfig,
        conversationFlow: {
          ...mockConfig.conversationFlow,
          intents: {}
        }
      };

      const match = matchIntent('book a ride', configNoIntents);
      expect(match).toBeNull();
    });

    it('should handle multiple trigger words in message', () => {
      const message = 'I need a ride and want to know the price';
      const match = matchIntent(message, mockConfig);

      // Should match first one (book_ride) since "ride" comes first
      expect(match).not.toBeNull();
      expect(match?.name).toBe('book_ride');
    });
  });

  describe('enhancePromptWithIntent', () => {
    it('should add intent information to prompt', () => {
      const basePrompt = 'You are a helpful assistant';
      const intent = {
        name: 'book_ride',
        response: 'Collect pickup location'
      };

      const enhanced = enhancePromptWithIntent(basePrompt, intent);

      expect(enhanced).toContain('You are a helpful assistant');
      expect(enhanced).toContain('MATCHED INTENT: Book Ride');
      expect(enhanced).toContain('Collect pickup location');
      expect(enhanced).toContain('IMPORTANT:');
    });

    it('should return original prompt if no intent', () => {
      const basePrompt = 'You are a helpful assistant';
      const enhanced = enhancePromptWithIntent(basePrompt, null);

      expect(enhanced).toBe(basePrompt);
    });

    it('should format intent name with spaces and capitals', () => {
      const basePrompt = 'Test prompt';
      const intent = {
        name: 'get_price_quote',
        response: 'Ask for details'
      };

      const enhanced = enhancePromptWithIntent(basePrompt, intent);

      expect(enhanced).toContain('Get Price Quote');
      expect(enhanced).not.toContain('get_price_quote');
    });

    it('should include focus reminder', () => {
      const basePrompt = 'Test prompt';
      const intent = {
        name: 'book_ride',
        response: 'Collect details'
      };

      const enhanced = enhancePromptWithIntent(basePrompt, intent);

      expect(enhanced).toContain('Focus your response on fulfilling this intent');
    });
  });

  describe('validateMessagesArray', () => {
    it('should validate correct messages array', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'user' as const, content: 'Help me' }
      ];

      expect(validateMessagesArray(messages)).toBe(true);
    });

    it('should reject empty array', () => {
      expect(validateMessagesArray([])).toBe(false);
    });

    it('should reject non-array input', () => {
      expect(validateMessagesArray(null as any)).toBe(false);
      expect(validateMessagesArray(undefined as any)).toBe(false);
      expect(validateMessagesArray('test' as any)).toBe(false);
    });

    it('should reject if first message is not system', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'system' as const, content: 'You are helpful' }
      ];

      expect(validateMessagesArray(messages)).toBe(false);
    });

    it('should reject if last message is not user', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi' }
      ];

      expect(validateMessagesArray(messages)).toBe(false);
    });

    it('should reject messages with missing role', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { content: 'Hello' } as any,
        { role: 'user' as const, content: 'Help' }
      ];

      expect(validateMessagesArray(messages)).toBe(false);
    });

    it('should reject messages with missing content', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'user' as const } as any
      ];

      expect(validateMessagesArray(messages)).toBe(false);
    });

    it('should reject invalid role values', () => {
      const messages = [
        { role: 'system' as const, content: 'You are helpful' },
        { role: 'customer' as any, content: 'Hello' },
        { role: 'user' as const, content: 'Help' }
      ];

      expect(validateMessagesArray(messages)).toBe(false);
    });
  });

  describe('integration - full prompt building flow', () => {
    it('should build complete prompt with all features', () => {
      const history = [
        { role: 'user', content: 'Hello', created_at: '2024-01-01T10:00:00Z' },
        { role: 'assistant', content: 'Hi!', created_at: '2024-01-01T10:00:01Z' }
      ];

      // Build messages
      const messages = buildMessagesArray(mockConfig, history, 'I need to book a ride');

      // Match intent
      const intent = matchIntent('I need to book a ride', mockConfig);

      // Enhance system prompt with intent
      if (intent) {
        messages[0].content = enhancePromptWithIntent(messages[0].content, intent);
      }

      // Validate
      const isValid = validateMessagesArray(messages);

      expect(isValid).toBe(true);
      expect(messages[0].content).toContain('Cape Town Cabs');
      expect(messages[0].content).toContain('MATCHED INTENT');
      expect(messages[0].content).toContain('Book Ride');
      expect(intent?.name).toBe('book_ride');
    });
  });
});
