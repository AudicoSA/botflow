/**
 * Bot Builder Service Tests
 *
 * Test suite for GPT-powered bot building functionality
 */

import { describe, test, expect, beforeAll, vi } from 'vitest';
import { BotBuilderService } from './bot-builder.service.js';
import { NodeRecommendationEngine } from './node-recommendation.service.js';

describe('BotBuilderService', () => {
  let service: BotBuilderService;

  beforeAll(() => {
    // Mock OpenAI API key for tests
    if (!process.env.OPENAI_API_KEY) {
      process.env.OPENAI_API_KEY = 'test-key';
    }
    service = new BotBuilderService();
  });

  describe('analyzeIntent', () => {
    test('analyzes simple greeting bot intent', async () => {
      const description = 'I want a bot that says "Hello" when someone says "hi"';
      const intent = await service.analyzeIntent(description, 'bot_123');

      expect(intent).toBeDefined();
      expect(intent.trigger).toBeDefined();
      expect(intent.trigger.type).toBe('keyword');
      expect(intent.steps).toBeInstanceOf(Array);
      expect(intent.steps.length).toBeGreaterThan(0);
    }, 30000); // 30s timeout for API call

    test('analyzes e-commerce order bot intent', async () => {
      const description = `
        Create a bot for my Shopify store that:
        1. Listens for "order" keyword
        2. Asks for order number
        3. Looks up order in Shopify
        4. If shipped, sends tracking info
        5. If not shipped, tells status
      `;
      const intent = await service.analyzeIntent(description, 'bot_123');

      expect(intent).toBeDefined();
      expect(intent.trigger.type).toBe('keyword');
      expect(intent.steps.length).toBeGreaterThanOrEqual(3);
      expect(intent.integrations.length).toBeGreaterThan(0);
      expect(intent.integrations[0].service.toLowerCase()).toContain('shopify');
      expect(intent.conditions.length).toBeGreaterThan(0);
    }, 30000);

    test('extracts variables from description', async () => {
      const description = 'Bot that asks for email and phone number';
      const intent = await service.analyzeIntent(description, 'bot_123');

      expect(intent.variables).toBeDefined();
      expect(intent.variables.length).toBeGreaterThan(0);
    }, 30000);

    test('handles minimum description length', async () => {
      const description = 'Bot';

      // Should still work but may have less detail
      const intent = await service.analyzeIntent(description, 'bot_123');
      expect(intent).toBeDefined();
    }, 30000);
  });

  describe('generateBlueprint', () => {
    test('generates valid Blueprint from simple intent', async () => {
      const intent = {
        trigger: {
          type: 'keyword' as const,
          description: 'hi',
          suggested_node: 'whatsapp_trigger'
        },
        steps: [
          {
            action: 'reply',
            description: 'say hello',
            suggested_node: 'whatsapp_reply',
            config_hints: { message: 'Hello!' }
          }
        ],
        conditions: [],
        integrations: [],
        variables: ['customer_phone']
      };

      const result = await service.generateBlueprint(intent, 'bot_123');

      expect(result).toBeDefined();
      expect(result.blueprint).toBeDefined();
      expect(result.blueprint.nodes.length).toBeGreaterThan(0);
      expect(result.blueprint.edges).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.warnings).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    }, 30000);

    test('generates Blueprint with conditional logic', async () => {
      const intent = {
        trigger: {
          type: 'keyword' as const,
          description: 'order',
          suggested_node: 'whatsapp_trigger'
        },
        steps: [
          {
            action: 'ask for order number',
            description: 'get order number',
            suggested_node: 'ask_question'
          },
          {
            action: 'lookup order',
            description: 'find in Shopify',
            suggested_node: 'shopify_lookup'
          }
        ],
        conditions: [
          {
            condition: 'order is shipped',
            true_path: 'send tracking',
            false_path: 'send status'
          }
        ],
        integrations: [
          {
            service: 'Shopify',
            purpose: 'order lookup'
          }
        ],
        variables: ['order_number', 'order_status']
      };

      const result = await service.generateBlueprint(intent, 'bot_123');

      expect(result.blueprint.nodes.length).toBeGreaterThan(3);

      // Should have if_condition node
      const hasCondition = result.blueprint.nodes.some(
        n => n.type === 'if_condition'
      );
      expect(hasCondition).toBe(true);

      // Should have Shopify integration
      const hasShopify = result.blueprint.nodes.some(
        n => n.type === 'shopify_lookup'
      );
      expect(hasShopify).toBe(true);
    }, 30000);

    test('validates generated Blueprint structure', async () => {
      const intent = {
        trigger: {
          type: 'any_message' as const,
          description: 'any message',
          suggested_node: 'whatsapp_trigger'
        },
        steps: [
          {
            action: 'reply',
            description: 'respond',
            suggested_node: 'whatsapp_reply'
          }
        ],
        conditions: [],
        integrations: [],
        variables: []
      };

      const result = await service.generateBlueprint(intent, 'bot_123');
      const bp = result.blueprint;

      // Check required fields
      expect(bp.bot_id).toBeDefined();
      expect(bp.version).toBeDefined();
      expect(bp.name).toBeDefined();
      expect(bp.nodes).toBeInstanceOf(Array);
      expect(bp.edges).toBeInstanceOf(Array);

      // Check node structure
      for (const node of bp.nodes) {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.config).toBeDefined();
      }

      // Check edge structure
      for (const edge of bp.edges) {
        expect(edge.id).toBeDefined();
        expect(edge.source).toBeDefined();
        expect(edge.target).toBeDefined();
      }
    }, 30000);
  });

  describe('generateOptimizations', () => {
    test('provides optimization suggestions', async () => {
      const blueprint = {
        bot_id: 'bot_123',
        version: '1.0.0',
        name: 'Test Bot',
        nodes: [
          {
            id: '1',
            type: 'whatsapp_trigger',
            config: { keyword: 'test' }
          },
          {
            id: '2',
            type: 'shopify_lookup',
            config: {}
          },
          {
            id: '3',
            type: 'whatsapp_reply',
            config: { message: 'Done' }
          }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' }
        ]
      };

      const suggestions = await service.generateOptimizations(blueprint);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);

      // Should suggest error handling for Shopify
      const hasErrorHandling = suggestions.some(s =>
        s.toLowerCase().includes('error') || s.toLowerCase().includes('try')
      );
      expect(hasErrorHandling).toBe(true);
    }, 30000);
  });

  describe('conversationalBuilder', () => {
    test('handles multi-turn conversation', async () => {
      const messages = [
        { role: 'user' as const, content: 'I want to make a bot for my store' },
        { role: 'assistant' as const, content: 'What should the bot help with?' },
        { role: 'user' as const, content: 'Order tracking' },
        { role: 'assistant' as const, content: 'Where do you store orders?' },
        { role: 'user' as const, content: 'Shopify' }
      ];

      const result = await service.conversationalBuilder(messages, 'bot_123');

      expect(result).toBeDefined();
      expect(result.response).toBeDefined();
      expect(typeof result.response).toBe('string');
      expect(result.complete).toBeDefined();
    }, 30000);

    test('generates Blueprint when conversation is complete', async () => {
      const messages = [
        { role: 'user' as const, content: 'Create a bot that responds hello when someone says hi' },
        { role: 'assistant' as const, content: 'Got it! Should it say anything else?' },
        { role: 'user' as const, content: 'No, just hello is fine' },
        { role: 'assistant' as const, content: 'Perfect! Creating your bot now...' }
      ];

      const result = await service.conversationalBuilder(messages, 'bot_123');

      if (result.complete) {
        expect(result.intent).toBeDefined();
        expect(result.blueprint).toBeDefined();
        expect(result.blueprint!.nodes.length).toBeGreaterThan(0);
      }
    }, 30000);
  });
});

describe('NodeRecommendationEngine', () => {
  let engine: NodeRecommendationEngine;

  beforeAll(() => {
    engine = new NodeRecommendationEngine();
  });

  describe('recommendNodes', () => {
    test('recommends ask_question for input actions', () => {
      const recs = engine.recommendNodes('ask for email address');

      expect(recs).toBeInstanceOf(Array);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].node_type).toBe('ask_question');
      expect(recs[0].confidence).toBeGreaterThan(0.6);
    });

    test('recommends whatsapp_reply for sending messages', () => {
      const recs = engine.recommendNodes('send a message to customer');

      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].node_type).toBe('whatsapp_reply');
    });

    test('recommends if_condition for conditional logic', () => {
      const recs = engine.recommendNodes('if order is ready then notify customer');

      const hasCondition = recs.some(r => r.node_type === 'if_condition');
      expect(hasCondition).toBe(true);
    });

    test('recommends shopify_lookup for Shopify actions', () => {
      const recs = engine.recommendNodes('lookup product in Shopify');

      const hasShopify = recs.some(r => r.node_type === 'shopify_lookup');
      expect(hasShopify).toBe(true);
    });

    test('recommends paystack_payment for payment actions', () => {
      const recs = engine.recommendNodes('send payment link');

      const hasPaystack = recs.some(r => r.node_type === 'paystack_payment');
      expect(hasPaystack).toBe(true);
    });

    test('recommends knowledge_search for knowledge base queries', () => {
      const recs = engine.recommendNodes('search FAQ documents');

      const hasKnowledge = recs.some(r => r.node_type === 'knowledge_search');
      expect(hasKnowledge).toBe(true);
    });

    test('returns top 3 recommendations', () => {
      const recs = engine.recommendNodes('send message and ask question');

      expect(recs.length).toBeLessThanOrEqual(3);
    });

    test('applies context boost', () => {
      const recs = engine.recommendNodes('next step', {
        previousNodes: ['ask_question'],
        integrations: ['shopify']
      });

      expect(recs).toBeInstanceOf(Array);
      // Should boost nodes that make sense after ask_question
    });
  });

  describe('scoreNode', () => {
    test('scores node relevance to intent', () => {
      const intent = {
        trigger: {
          type: 'keyword' as const,
          description: 'order',
          suggested_node: 'whatsapp_trigger'
        },
        steps: [
          {
            action: 'lookup',
            description: 'find order',
            suggested_node: 'shopify_lookup'
          }
        ],
        conditions: [],
        integrations: [
          {
            service: 'Shopify',
            purpose: 'order lookup'
          }
        ],
        variables: []
      };

      const score = engine.scoreNode('shopify_lookup', intent);

      expect(score).toBeGreaterThan(5);
    });

    test('gives high score for mentioned nodes', () => {
      const intent = {
        trigger: {
          type: 'keyword' as const,
          description: 'hi',
          suggested_node: 'whatsapp_trigger'
        },
        steps: [
          {
            action: 'ask',
            description: 'ask name',
            suggested_node: 'ask_question'
          }
        ],
        conditions: [],
        integrations: [],
        variables: []
      };

      const score = engine.scoreNode('ask_question', intent);

      expect(score).toBeGreaterThanOrEqual(10);
    });
  });

  describe('validateNodeSelection', () => {
    test('validates node selection has trigger', () => {
      const validation = engine.validateNodeSelection([
        'whatsapp_trigger',
        'ask_question',
        'whatsapp_reply'
      ]);

      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    test('detects missing trigger node', () => {
      const validation = engine.validateNodeSelection([
        'ask_question',
        'whatsapp_reply'
      ]);

      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
      expect(validation.issues[0]).toContain('trigger');
    });

    test('suggests error handling for integrations', () => {
      const validation = engine.validateNodeSelection([
        'whatsapp_trigger',
        'shopify_lookup',
        'whatsapp_reply'
      ]);

      const hasErrorSuggestion = validation.suggestions.some(s =>
        s.toLowerCase().includes('try_catch') || s.toLowerCase().includes('error')
      );
      expect(hasErrorSuggestion).toBe(true);
    });
  });

  describe('suggestAlternatives', () => {
    test('suggests alternatives for if_condition', () => {
      const alternatives = engine.suggestAlternatives('if_condition');

      expect(alternatives).toBeInstanceOf(Array);
      expect(alternatives).toContain('switch_case');
    });

    test('suggests alternatives for http_request', () => {
      const alternatives = engine.suggestAlternatives('http_request');

      expect(alternatives).toContain('database_query');
    });
  });

  describe('getNodeCategoryStats', () => {
    test('returns category distribution', () => {
      const stats = engine.getNodeCategoryStats([
        'whatsapp_trigger',
        'ask_question',
        'whatsapp_reply',
        'if_condition'
      ]);

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
      expect(stats['communication']).toBeGreaterThan(0);
      expect(stats['logic']).toBeGreaterThan(0);
    });
  });
});
