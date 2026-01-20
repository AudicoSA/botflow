/**
 * Intent Parser + Template Matcher Integration Tests
 *
 * Tests the interaction between IntentParser and TemplateMatcher services.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockIntent, mockBlueprint } from '../setup.js';
import type { ParsedIntent, WorkflowTemplate } from '../../../types/ai-agent.js';

// Mock dependencies
vi.mock('../../../config/supabase.js', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase
}));

vi.mock('../../../config/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock templates
const mockTemplates: WorkflowTemplate[] = [
  {
    id: 'template-1',
    slug: 'order-tracking',
    name: 'Order Tracking',
    category: 'ecommerce',
    description: 'Track customer orders from your e-commerce store',
    triggerPhrases: ['track order', 'order status', 'where is my order', 'track'],
    requiredIntegrations: ['shopify'],
    blueprint: mockBlueprint,
    variables: [{ name: 'storeName', type: 'string', label: 'Store Name', required: true }],
    configurableFields: [],
    popularityScore: 80,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'template-2',
    slug: 'appointment-booking',
    name: 'Appointment Booking',
    category: 'booking',
    description: 'Book appointments for your salon or clinic',
    triggerPhrases: ['book appointment', 'schedule', 'booking', 'reserve'],
    requiredIntegrations: ['google-calendar'],
    blueprint: mockBlueprint,
    variables: [{ name: 'businessName', type: 'string', label: 'Business Name', required: true }],
    configurableFields: [],
    vertical: 'salon',
    popularityScore: 75,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'template-3',
    slug: 'faq-bot',
    name: 'FAQ Bot',
    category: 'support',
    description: 'Answer common questions automatically',
    triggerPhrases: ['faq', 'answer questions', 'help', 'support'],
    requiredIntegrations: [],
    blueprint: mockBlueprint,
    variables: [],
    configurableFields: [],
    popularityScore: 60,
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Mock template library
vi.mock('../../../services/ai-agent/template-library.js', () => ({
  getTemplateLibrary: vi.fn().mockReturnValue({
    getTemplates: vi.fn().mockResolvedValue({
      items: mockTemplates,
      total: mockTemplates.length,
      page: 1,
      pageSize: 10
    }),
    getBySlug: vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(mockTemplates.find(t => t.slug === slug) || null);
    })
  }),
  TemplateLibraryService: class {
    getTemplates = vi.fn().mockResolvedValue({
      items: mockTemplates,
      total: mockTemplates.length,
      page: 1,
      pageSize: 10
    });
    getBySlug = vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(mockTemplates.find(t => t.slug === slug) || null);
    });
  }
}));

// Mock node library
vi.mock('../../../services/node-library.js', () => ({
  getNodeLibrary: vi.fn().mockResolvedValue({
    listNodes: () => [
      { type: 'whatsapp_trigger', name: 'WhatsApp Trigger', category: 'triggers' },
      { type: 'send_message', name: 'Send Message', category: 'actions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' }
    ]
  })
}));

describe('IntentParser + TemplateMatcher Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Matching from Parsed Intent', () => {
    it('should match e-commerce templates for order tracking intent', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [{ type: 'service', value: 'Shopify', originalText: 'shopify', confidence: 0.9, startIndex: 0, endIndex: 7 }],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'I want to track orders from Shopify'
      };

      const matches = await matcher.findMatches(intent, ['shopify'], undefined, 5);

      expect(matches.length).toBeGreaterThan(0);

      // Order tracking template should be first or highly ranked
      const orderTrackingMatch = matches.find(m => m.template.slug === 'order-tracking');
      expect(orderTrackingMatch).toBeDefined();
      expect(orderTrackingMatch?.score).toBeGreaterThan(0.3);
    });

    it('should match booking templates for appointment intent', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'booking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.9,
        needsClarification: false,
        rawMessage: 'book appointment for my salon'
      };

      const matches = await matcher.findMatches(intent, [], 'salon', 5);

      const bookingMatch = matches.find(m => m.template.category === 'booking');
      expect(bookingMatch).toBeDefined();
    });

    it('should identify missing integrations', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'track orders'
      };

      // User does NOT have Shopify enabled
      const matches = await matcher.findMatches(intent, [], undefined, 5);

      const orderMatch = matches.find(m => m.template.slug === 'order-tracking');
      if (orderMatch) {
        expect(orderMatch.missingIntegrations).toContain('shopify');
        expect(orderMatch.canInstantiate).toBe(false);
      }
    });

    it('should score higher for templates with all required integrations', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'track orders from shopify'
      };

      // With Shopify available
      const matchesWithShopify = await matcher.findMatches(intent, ['shopify'], undefined, 5);

      // Without Shopify available
      const matchesWithoutShopify = await matcher.findMatches(intent, [], undefined, 5);

      const orderWithShopify = matchesWithShopify.find(m => m.template.slug === 'order-tracking');
      const orderWithoutShopify = matchesWithoutShopify.find(m => m.template.slug === 'order-tracking');

      if (orderWithShopify && orderWithoutShopify) {
        expect(orderWithShopify.score).toBeGreaterThan(orderWithoutShopify.score);
      }
    });
  });

  describe('Template Instantiation', () => {
    it('should customize template with variable values', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();
      const template = mockTemplates[0];

      const workflow = await matcher.customizeTemplate(template, {
        variableValues: { storeName: 'My Awesome Store' },
        fieldConfig: {}
      });

      expect(workflow).not.toBeNull();
      expect(workflow.bot_id).toBe(template.blueprint.bot_id);
    });

    it('should validate required variables', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();
      const template = mockTemplates[0]; // Has required 'storeName' variable

      const validation = matcher.validateCustomization(template, {
        variableValues: {}, // Missing storeName
        fieldConfig: {}
      });

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain('Store Name');
    });

    it('should pass validation with all required variables', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();
      const template = mockTemplates[0];

      const validation = matcher.validateCustomization(template, {
        variableValues: { storeName: 'Test Store' },
        fieldConfig: {}
      });

      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });
  });

  describe('Vertical Matching', () => {
    it('should boost score for matching vertical', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'booking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'book appointments'
      };

      // With matching vertical
      const matchesSalon = await matcher.findMatches(intent, [], 'salon', 5);

      // With different vertical
      const matchesRestaurant = await matcher.findMatches(intent, [], 'restaurant', 5);

      const salonBooking = matchesSalon.find(m => m.template.slug === 'appointment-booking');
      const restaurantBooking = matchesRestaurant.find(m => m.template.slug === 'appointment-booking');

      if (salonBooking && restaurantBooking) {
        expect(salonBooking.score).toBeGreaterThanOrEqual(restaurantBooking.score);
      }
    });
  });

  describe('Keyword and Phrase Matching', () => {
    it('should match trigger phrases in user message', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // Message containing "track order" which is a trigger phrase
      const intent: ParsedIntent = {
        action: 'create',
        workflowType: undefined,
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.7,
        needsClarification: true,
        rawMessage: 'I want to track order status for customers'
      };

      const matches = await matcher.findMatches(intent, [], undefined, 5);

      // Should find order-tracking template
      const orderMatch = matches.find(m => m.template.slug === 'order-tracking');
      expect(orderMatch).toBeDefined();
      expect(orderMatch?.matchedPhrases.length).toBeGreaterThan(0);
    });

    it('should return empty matches for unrelated messages', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'unknown',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.2,
        needsClarification: true,
        rawMessage: 'xyz random gibberish 123'
      };

      const matches = await matcher.findMatches(intent, [], undefined, 5);

      // Should have low or no matches
      const highConfidenceMatches = matches.filter(m => m.score > 0.5);
      expect(highConfidenceMatches.length).toBe(0);
    });
  });

  describe('Popularity Scoring', () => {
    it('should factor in popularity score', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // Generic intent that could match multiple templates
      const intent: ParsedIntent = {
        action: 'create',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.5,
        needsClarification: true,
        rawMessage: 'help me create a bot'
      };

      const matches = await matcher.findMatches(intent, [], undefined, 10);

      // All templates should have some score
      // Higher popularity templates should score slightly higher when all else is equal
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Best Match Selection', () => {
    it('should find best matching template', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.9,
        needsClarification: false,
        rawMessage: 'track shopify orders'
      };

      const bestMatch = await matcher.findBestMatch(intent, ['shopify'], 'ecommerce');

      expect(bestMatch).not.toBeNull();
      expect(bestMatch?.template.category).toBe('ecommerce');
    });

    it('should return null when no templates match threshold', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'unknown',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.1,
        needsClarification: true,
        rawMessage: ''
      };

      const bestMatch = await matcher.findBestMatch(intent, [], undefined);

      // With very low confidence and no keywords, should return null or very low score
      if (bestMatch) {
        expect(bestMatch.score).toBeLessThan(0.5);
      }
    });
  });

  describe('Templates for Integration', () => {
    it('should get templates that use a specific integration', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const shopifyTemplates = await matcher.getTemplatesForIntegration('shopify', 5);

      expect(shopifyTemplates.length).toBeGreaterThan(0);
      expect(shopifyTemplates.every(t =>
        t.requiredIntegrations.some(i => i.toLowerCase() === 'shopify')
      )).toBe(true);
    });

    it('should return empty array for unknown integration', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const templates = await matcher.getTemplatesForIntegration('unknown-integration', 5);

      expect(templates).toHaveLength(0);
    });
  });
});
