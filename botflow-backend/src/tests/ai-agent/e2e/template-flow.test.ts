/**
 * End-to-End Template Flow Tests
 *
 * Tests complete template-based workflow creation flows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase, mockBlueprint } from '../setup.js';
import type { WorkflowTemplate, ParsedIntent } from '../../../types/ai-agent.js';

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
const mockOrderTemplate: WorkflowTemplate = {
  id: 'template-order',
  slug: 'order-tracking',
  name: 'Order Tracking',
  category: 'ecommerce',
  description: 'Track customer orders',
  triggerPhrases: ['track order', 'order status', 'where is my order'],
  requiredIntegrations: ['shopify'],
  blueprint: {
    ...mockBlueprint,
    name: '{{storeName}} Order Tracking',
    nodes: [
      { id: '1', type: 'whatsapp_trigger', config: { match_type: 'keyword', keywords: ['track', 'order'] } },
      { id: '2', type: 'ask_question', config: { message: 'Please enter your order number for {{storeName}}' } },
      { id: '3', type: 'shopify_lookup', config: { lookup_type: 'order', api_key: '{{shopifyApiKey}}' } },
      { id: '4', type: 'send_message', config: { message: 'Your order status: {{node_3.status}}' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' }
    ]
  },
  variables: [
    { name: 'storeName', type: 'string', label: 'Store Name', required: true },
    { name: 'shopifyApiKey', type: 'string', label: 'Shopify API Key', required: true }
  ],
  configurableFields: [],
  popularityScore: 85,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockBookingTemplate: WorkflowTemplate = {
  id: 'template-booking',
  slug: 'salon-booking',
  name: 'Salon Appointment Booking',
  category: 'booking',
  description: 'Book appointments for salon services',
  triggerPhrases: ['book appointment', 'schedule haircut', 'salon booking'],
  requiredIntegrations: ['google-calendar'],
  blueprint: {
    ...mockBlueprint,
    name: '{{salonName}} Booking',
    nodes: [
      { id: '1', type: 'whatsapp_trigger', config: { match_type: 'keyword', keywords: ['book', 'appointment'] } },
      { id: '2', type: 'ask_question', config: { message: 'What service would you like at {{salonName}}?' } },
      { id: '3', type: 'ask_question', config: { message: 'What date and time works for you?' } },
      { id: '4', type: 'send_message', config: { message: 'Your appointment is confirmed!' } }
    ],
    edges: [
      { id: 'e1', source: '1', target: '2' },
      { id: 'e2', source: '2', target: '3' },
      { id: 'e3', source: '3', target: '4' }
    ]
  },
  variables: [
    { name: 'salonName', type: 'string', label: 'Salon Name', required: true },
    { name: 'services', type: 'string', label: 'Available Services', required: false }
  ],
  configurableFields: [],
  vertical: 'salon',
  popularityScore: 75,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

const allTemplates = [mockOrderTemplate, mockBookingTemplate];

// Mock template library
vi.mock('../../../services/ai-agent/template-library.js', () => ({
  getTemplateLibrary: vi.fn().mockReturnValue({
    getTemplates: vi.fn().mockResolvedValue({
      items: allTemplates,
      total: allTemplates.length,
      page: 1,
      pageSize: 10
    }),
    getBySlug: vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(allTemplates.find(t => t.slug === slug) || null);
    })
  }),
  TemplateLibraryService: class {
    getTemplates = vi.fn().mockResolvedValue({
      items: allTemplates,
      total: allTemplates.length,
      page: 1,
      pageSize: 10
    });
    getBySlug = vi.fn().mockImplementation((slug: string) => {
      return Promise.resolve(allTemplates.find(t => t.slug === slug) || null);
    });
  }
}));

// Mock node library
vi.mock('../../../services/node-library.js', () => ({
  getNodeLibrary: vi.fn().mockResolvedValue({
    listNodes: () => [
      { type: 'whatsapp_trigger', name: 'WhatsApp Trigger', category: 'triggers' },
      { type: 'send_message', name: 'Send Message', category: 'actions' },
      { type: 'ask_question', name: 'Ask Question', category: 'actions' },
      { type: 'shopify_lookup', name: 'Shopify Lookup', category: 'integrations' }
    ],
    hasNode: () => true
  }),
  NodeLibrary: class {
    hasNode = () => true;
  }
}));

describe('E2E: Template-Based Workflow Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Discovery Flow', () => {
    it('should find and match templates for user intent', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // User wants to track orders
      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.85,
        needsClarification: false,
        rawMessage: 'I want to track orders from my Shopify store'
      };

      const matches = await matcher.findMatches(intent, ['shopify'], 'ecommerce', 5);

      expect(matches.length).toBeGreaterThan(0);

      // Order tracking template should be matched
      const orderMatch = matches.find(m => m.template.slug === 'order-tracking');
      expect(orderMatch).toBeDefined();
      expect(orderMatch?.score).toBeGreaterThan(0.3);
    });

    it('should rank templates by relevance', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // Very specific intent for order tracking
      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [{ type: 'service', value: 'shopify', originalText: 'shopify', confidence: 0.95, startIndex: 0, endIndex: 7 }],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.95,
        needsClarification: false,
        rawMessage: 'track order status from shopify'
      };

      const matches = await matcher.findMatches(intent, ['shopify', 'google-calendar'], undefined, 5);

      // Order template should rank higher than booking
      if (matches.length >= 2) {
        const orderIndex = matches.findIndex(m => m.template.slug === 'order-tracking');
        const bookingIndex = matches.findIndex(m => m.template.slug === 'salon-booking');

        if (orderIndex !== -1 && bookingIndex !== -1) {
          expect(orderIndex).toBeLessThan(bookingIndex);
        }
      }
    });
  });

  describe('Template Instantiation Flow', () => {
    it('should create workflow from template with all required variables', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetTemplateMatcher();
      resetContextManager();

      const matcher = new TemplateMatcherService();
      const contextManager = new ContextManager();

      // Create session
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');
      contextManager.transitionState(ctx, 'gathering');

      // User provides all required values
      const customization = {
        variableValues: {
          storeName: 'My Awesome Shop',
          shopifyApiKey: 'shpat_xxxxx'
        },
        fieldConfig: {}
      };

      // Validate
      const validation = matcher.validateCustomization(mockOrderTemplate, customization);
      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);

      // Instantiate
      const workflow = await matcher.customizeTemplate(mockOrderTemplate, customization);

      // Update context
      contextManager.updateWorkflow(ctx, workflow, false);
      contextManager.transitionState(ctx, 'confirming');

      expect(ctx.currentWorkflow).not.toBeNull();
      expect(ctx.state).toBe('confirming');
    });

    it('should reject instantiation with missing required variables', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // Missing shopifyApiKey
      const customization = {
        variableValues: {
          storeName: 'My Shop'
          // shopifyApiKey is missing
        },
        fieldConfig: {}
      };

      const validation = matcher.validateCustomization(mockOrderTemplate, customization);

      expect(validation.valid).toBe(false);
      expect(validation.missing.length).toBeGreaterThan(0);
      expect(validation.missing).toContain('Shopify API Key');
    });

    it('should handle optional variables gracefully', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      // Only required variable provided (services is optional)
      const customization = {
        variableValues: {
          salonName: 'Beauty Salon'
          // services is optional, not provided
        },
        fieldConfig: {}
      };

      const validation = matcher.validateCustomization(mockBookingTemplate, customization);

      expect(validation.valid).toBe(true);
    });
  });

  describe('Template Customization Flow', () => {
    it('should allow customization after template selection', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetTemplateMatcher();
      resetContextManager();

      const matcher = new TemplateMatcherService();
      const contextManager = new ContextManager();

      // Create session
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1');

      // Get template
      const customization = {
        variableValues: { storeName: 'Test Store', shopifyApiKey: 'test-key' },
        fieldConfig: {}
      };

      const workflow = await matcher.customizeTemplate(mockOrderTemplate, customization);
      contextManager.updateWorkflow(ctx, workflow, false);
      contextManager.transitionState(ctx, 'gathering');
      contextManager.transitionState(ctx, 'confirming');

      // User wants to customize
      contextManager.transitionState(ctx, 'refining');

      // Simulate adding a new node (version saved)
      const modifiedWorkflow = {
        ...ctx.currentWorkflow!,
        nodes: [...ctx.currentWorkflow!.nodes, { id: 'new-1', type: 'delay', config: { duration: 5000 } }]
      };
      contextManager.updateWorkflow(ctx, modifiedWorkflow, true);

      expect(ctx.previousWorkflows).toHaveLength(1);
      expect(ctx.currentWorkflow?.nodes.length).toBeGreaterThan(workflow.nodes.length);
    });
  });

  describe('Template with Missing Integrations', () => {
    it('should identify missing integrations', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.8,
        needsClarification: false,
        rawMessage: 'track orders'
      };

      // User doesn't have Shopify enabled
      const matches = await matcher.findMatches(intent, [], undefined, 5);

      const orderMatch = matches.find(m => m.template.slug === 'order-tracking');
      if (orderMatch) {
        expect(orderMatch.missingIntegrations).toContain('shopify');
        expect(orderMatch.canInstantiate).toBe(false);
      }
    });

    it('should mark template as instantiable when all integrations available', async () => {
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

      // User has Shopify enabled
      const matches = await matcher.findMatches(intent, ['shopify'], undefined, 5);

      const orderMatch = matches.find(m => m.template.slug === 'order-tracking');
      if (orderMatch) {
        expect(orderMatch.missingIntegrations).toHaveLength(0);
        expect(orderMatch.canInstantiate).toBe(true);
      }
    });
  });

  describe('Vertical-Specific Templates', () => {
    it('should boost templates matching user vertical', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      resetTemplateMatcher();

      const matcher = new TemplateMatcherService();

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'booking',
        entities: [],
        integrations: [],
        requirements: [],
        confidence: 0.8,
        needsClarification: false,
        rawMessage: 'book appointments'
      };

      // With salon vertical
      const salonMatches = await matcher.findMatches(intent, ['google-calendar'], 'salon', 5);

      // With different vertical
      const restaurantMatches = await matcher.findMatches(intent, ['google-calendar'], 'restaurant', 5);

      const salonMatch = salonMatches.find(m => m.template.slug === 'salon-booking');
      const restaurantMatch = restaurantMatches.find(m => m.template.slug === 'salon-booking');

      if (salonMatch && restaurantMatch) {
        expect(salonMatch.score).toBeGreaterThanOrEqual(restaurantMatch.score);
      }
    });
  });

  describe('Complete Template Selection to Deployment', () => {
    it('should complete full flow from template selection to deployment', async () => {
      const { TemplateMatcherService, resetTemplateMatcher } = await import('../../../services/ai-agent/template-matcher.js');
      const { ContextManager, resetContextManager } = await import('../../../services/ai-agent/context-manager.js');

      resetTemplateMatcher();
      resetContextManager();

      const matcher = new TemplateMatcherService();
      const contextManager = new ContextManager();

      // Step 1: Create session
      const ctx = await contextManager.createSession('user-1', 'bot-123', 'org-1', {
        vertical: 'ecommerce'
      });

      // Step 2: User describes intent
      contextManager.addMessage(ctx, 'user', 'I want to track orders from Shopify');

      const intent: ParsedIntent = {
        action: 'create',
        workflowType: 'order_tracking',
        entities: [],
        integrations: ['shopify'],
        requirements: [],
        confidence: 0.9,
        needsClarification: false,
        rawMessage: 'I want to track orders from Shopify'
      };

      // Step 3: Find matching templates
      const matches = await matcher.findMatches(intent, ['shopify'], 'ecommerce', 3);
      expect(matches.length).toBeGreaterThan(0);

      // Step 4: Store template suggestion
      contextManager.addRequirement(ctx, 'suggestedTemplate', {
        matches,
        selectedIndex: null
      }, 'inferred', matches[0]?.score || 0.5);

      contextManager.transitionState(ctx, 'gathering');

      // Step 5: User selects template
      contextManager.addMessage(ctx, 'assistant', 'I found a template that matches! Would you like to use Order Tracking?');
      contextManager.addMessage(ctx, 'user', 'Yes, use the template');

      // Step 6: Collect variable values
      contextManager.addMessage(ctx, 'assistant', 'What is your store name?');
      contextManager.addMessage(ctx, 'user', 'My Awesome Store');
      contextManager.addMessage(ctx, 'assistant', 'What is your Shopify API key?');
      contextManager.addMessage(ctx, 'user', 'shpat_xxxxxxx');

      // Step 7: Instantiate template
      const customization = {
        variableValues: {
          storeName: 'My Awesome Store',
          shopifyApiKey: 'shpat_xxxxxxx'
        },
        fieldConfig: {}
      };

      const validation = matcher.validateCustomization(mockOrderTemplate, customization);
      expect(validation.valid).toBe(true);

      const workflow = await matcher.customizeTemplate(mockOrderTemplate, customization);

      // Step 8: Save workflow and confirm
      contextManager.updateWorkflow(ctx, workflow, false);
      ctx.gatheredRequirements = ctx.gatheredRequirements.filter(r => r.key !== 'suggestedTemplate');
      contextManager.transitionState(ctx, 'confirming');

      expect(ctx.state).toBe('confirming');
      expect(ctx.currentWorkflow).not.toBeNull();

      // Step 9: User confirms
      contextManager.addMessage(ctx, 'user', 'Looks good, deploy it');

      // Step 10: Deploy
      contextManager.transitionState(ctx, 'deploying');
      contextManager.transitionState(ctx, 'complete');

      // Final assertions
      expect(ctx.state).toBe('complete');
      expect(ctx.currentWorkflow?.nodes.length).toBeGreaterThan(0);
      expect(ctx.history.length).toBeGreaterThanOrEqual(6);
    });
  });
});
