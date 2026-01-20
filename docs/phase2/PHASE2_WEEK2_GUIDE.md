# Phase 2 Week 2: Dynamic Workflow Engine - Implementation Guide

**Status:** In Progress 🏗️
**Started:** 2026-01-16
**Goal:** Build the backend engine that compiles Blueprint JSON into n8n workflows

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Blueprint JSON Schema](#blueprint-json-schema)
4. [Node Library](#node-library)
5. [Workflow Compiler](#workflow-compiler)
6. [Variable Injection](#variable-injection)
7. [Versioning System](#versioning-system)
8. [n8n Integration](#n8n-integration)
9. [API Reference](#api-reference)
10. [Examples](#examples)
11. [Testing](#testing)
12. [Security](#security)

---

## Overview

The Dynamic Workflow Engine transforms high-level Blueprint JSON (user-friendly configuration) into production-ready n8n workflows. This enables the Visual Builder (Week 4) to let users create custom bots without writing code.

### What We're Building

**Input (Blueprint JSON):**
```json
{
  "bot_id": "bot_123",
  "version": "1.0.0",
  "nodes": [
    { "id": "1", "type": "whatsapp_trigger", "config": {} },
    { "id": "2", "type": "whatsapp_reply", "config": {
      "message": "Hello {{customer_name}}!",
      "recipient": "{{customer_phone}}"
    }}
  ],
  "edges": [
    { "id": "e1", "source": "1", "target": "2" }
  ],
  "variables": {},
  "credentials": []
}
```

**Output (n8n Workflow):**
```json
{
  "name": "Bot bot_123 v1.0.0",
  "nodes": [
    {
      "id": "n8n_node_1",
      "name": "WhatsApp Trigger",
      "type": "n8n-nodes-base.webhook",
      "position": [300, 300],
      "parameters": { ... }
    },
    {
      "id": "n8n_node_2",
      "name": "WhatsApp Reply",
      "type": "n8n-nodes-base.httpRequest",
      "position": [550, 300],
      "parameters": { ... }
    }
  ],
  "connections": { ... },
  "active": true
}
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────┐
│                    User (Dashboard)                     │
└──────────────────────┬──────────────────────────────────┘
                       │ Blueprint JSON
                       ▼
┌─────────────────────────────────────────────────────────┐
│               Workflow API (workflows.ts)               │
│  POST /api/bots/:id/workflows                           │
│  GET  /api/bots/:id/workflows                           │
│  POST /api/bots/:id/workflows/:v/activate               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Workflow Validator (validates blueprint)      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│      Node Library (node-library.ts)                     │
│      - Loads node definitions                           │
│      - Validates node configurations                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│   Workflow Compiler (workflow-compiler.ts)              │
│   - Blueprint → n8n conversion                          │
│   - Node positioning (auto-layout)                      │
│   - Edge creation                                       │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  Variable Injector (variable-injector.ts)               │
│  - Replaces {{variables}}                               │
│  - Injects credentials                                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          Database (workflow_versions table)             │
│          - Stores Blueprint + n8n workflow              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│        n8n Client (n8n-client.ts)                       │
│        - Deploys to n8n                                 │
│        - Activates workflow                             │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User creates workflow** in Visual Builder (Week 4) or via API
2. **API receives Blueprint JSON** and validates structure
3. **Node Library validates** each node's configuration
4. **Workflow Compiler converts** Blueprint → n8n workflow
5. **Variable Injector** replaces {{variables}} and credentials
6. **Database stores** both Blueprint and compiled n8n workflow
7. **n8n Client deploys** workflow to n8n instance
8. **Workflow is activated** and ready to process messages

---

## Blueprint JSON Schema

### Blueprint Structure

```typescript
interface Blueprint {
  bot_id: string;           // Bot this workflow belongs to
  version: string;          // Semantic version (1.0.0)
  name: string;             // Human-readable name
  description?: string;     // Optional description
  nodes: BlueprintNode[];   // Workflow nodes
  edges: BlueprintEdge[];   // Connections between nodes
  variables: Record<string, string>;  // Default variables
  credentials: BlueprintCredential[]; // Service credentials
}
```

### Blueprint Node

```typescript
interface BlueprintNode {
  id: string;               // Unique node ID (e.g., "1", "2", "3")
  type: string;             // Node type from Node Library
  name?: string;            // Optional custom name
  config: Record<string, any>; // Node-specific configuration
  position?: { x: number; y: number }; // Optional manual positioning
}
```

### Blueprint Edge

```typescript
interface BlueprintEdge {
  id: string;               // Unique edge ID
  source: string;           // Source node ID
  target: string;           // Target node ID
  sourceHandle?: string;    // For conditional branching (e.g., "true", "false")
  targetHandle?: string;
  label?: string;           // Optional label
}
```

### Example Blueprint

```json
{
  "bot_id": "bot_abc123",
  "version": "1.0.0",
  "name": "Simple Greeting Bot",
  "description": "Responds to messages with a greeting",
  "nodes": [
    {
      "id": "1",
      "type": "whatsapp_trigger",
      "config": {
        "keyword": "hello"
      }
    },
    {
      "id": "2",
      "type": "whatsapp_reply",
      "config": {
        "message": "Hello! How can I help you today?",
        "recipient": "{{customer_phone}}"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "1",
      "target": "2"
    }
  ],
  "variables": {
    "business_name": "Acme Inc"
  },
  "credentials": []
}
```

---

## Node Library

### Node Definition Structure

Each node in the library defines:

1. **Metadata** - ID, name, description, category, icon
2. **Inputs** - Required/optional configuration fields
3. **Outputs** - Data produced by the node
4. **n8n Template** - Base n8n node structure
5. **Validation Rules** - Input validation

### Node Categories

- **trigger** - Initiates workflow (e.g., WhatsApp message received)
- **action** - Performs an action (e.g., send reply, call API)
- **condition** - Branches workflow based on logic
- **integration** - Connects to external service (Shopify, Paystack)
- **utility** - Helper nodes (store variable, transform data)

### Basic Nodes (Day 1)

#### 1. WhatsApp Trigger
- **Type:** `whatsapp_trigger`
- **Category:** trigger
- **Description:** Listens for incoming WhatsApp messages
- **Inputs:**
  - `keyword` (string, optional) - Only trigger on specific keyword
  - `webhook_path` (string, optional) - Custom webhook path
- **Outputs:**
  - `message` (object) - The incoming message
  - `customer_phone` (string) - Customer's phone number
  - `conversation_id` (string) - Conversation ID

#### 2. WhatsApp Reply
- **Type:** `whatsapp_reply`
- **Category:** action
- **Description:** Sends a message back to the customer
- **Inputs:**
  - `message` (string, required) - Message to send (supports {{variables}})
  - `recipient` (string, required) - Phone number or {{variable}}
- **Outputs:**
  - `sent` (boolean) - Success status
  - `message_id` (string) - WhatsApp message ID

#### 3. Ask Question
- **Type:** `ask_question`
- **Category:** action
- **Description:** Prompts user for input and waits for response
- **Inputs:**
  - `question` (string, required) - Question to ask
  - `variable_name` (string, required) - Where to store response
  - `timeout` (number, optional) - Wait time in seconds (default: 300)
- **Outputs:**
  - `response` (string) - User's response
  - `timed_out` (boolean) - Whether request timed out

#### 4. If/Then Condition
- **Type:** `if_condition`
- **Category:** condition
- **Description:** Branches workflow based on a condition
- **Inputs:**
  - `left_value` (string, required) - First value to compare
  - `operator` (select, required) - Comparison operator
  - `right_value` (string, optional) - Second value to compare
- **Outputs:**
  - `true` - Executes if condition is true
  - `false` - Executes if condition is false

#### 5. Store Variable
- **Type:** `store_variable`
- **Category:** utility
- **Description:** Saves data to conversation context
- **Inputs:**
  - `variable_name` (string, required) - Variable name
  - `value` (string, required) - Value to store
  - `scope` (select, required) - conversation/session/global
- **Outputs:**
  - `success` (boolean) - Success status

---

## Workflow Compiler

### Compilation Process

```typescript
class WorkflowCompiler {
  /**
   * Compiles a Blueprint into an n8n workflow
   */
  async compile(blueprint: Blueprint, options?: CompilerOptions): Promise<CompilationResult> {
    const startTime = Date.now();

    // 1. Validate Blueprint structure
    const validation = await this.validate(blueprint);
    if (!validation.valid) {
      return {
        success: false,
        validation,
        stats: { node_count: 0, edge_count: 0, compilation_time_ms: Date.now() - startTime }
      };
    }

    // 2. Create n8n workflow structure
    const workflow: N8nWorkflow = {
      name: `${blueprint.name} v${blueprint.version}`,
      nodes: [],
      connections: {},
      active: false,
      settings: {
        timezone: 'Africa/Johannesburg',
        saveExecutionProgress: true
      }
    };

    // 3. Convert Blueprint nodes → n8n nodes
    for (const blueprintNode of blueprint.nodes) {
      const n8nNode = await this.convertNode(blueprintNode);
      workflow.nodes.push(n8nNode);
    }

    // 4. Create connections
    workflow.connections = this.createConnections(blueprint.edges, workflow.nodes);

    // 5. Auto-layout nodes (if not manually positioned)
    if (options?.auto_layout !== false) {
      this.autoLayoutNodes(workflow.nodes, blueprint.edges);
    }

    return {
      success: true,
      workflow,
      validation,
      stats: {
        node_count: workflow.nodes.length,
        edge_count: blueprint.edges.length,
        compilation_time_ms: Date.now() - startTime
      }
    };
  }
}
```

### Node Conversion

Each Blueprint node is converted to an n8n node:

```typescript
async convertNode(blueprintNode: BlueprintNode): Promise<N8nNode> {
  // Get node definition from library
  const definition = await nodeLibrary.getNode(blueprintNode.type);

  // Clone n8n template
  const n8nNode = JSON.parse(JSON.stringify(definition.n8n_template));

  // Set node properties
  n8nNode.id = `n8n_${blueprintNode.id}`;
  n8nNode.name = blueprintNode.name || definition.name;
  n8nNode.type = definition.n8n_type;

  // Merge configuration
  n8nNode.parameters = {
    ...n8nNode.parameters,
    ...blueprintNode.config
  };

  return n8nNode;
}
```

### Auto-Layout Algorithm

Nodes are automatically positioned on the n8n canvas:

```typescript
function autoLayoutNodes(nodes: N8nNode[], edges: BlueprintEdge[]): void {
  const HORIZONTAL_SPACING = 250;
  const VERTICAL_SPACING = 150;
  const START_X = 300;
  const START_Y = 300;

  // Build adjacency list
  const graph = buildGraph(edges);

  // Topological sort to determine node order
  const sortedNodes = topologicalSort(graph);

  // Position nodes horizontally
  let currentX = START_X;
  let currentY = START_Y;

  for (const nodeId of sortedNodes) {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      node.position = [currentX, currentY];
      currentX += HORIZONTAL_SPACING;
    }
  }
}
```

---

## Variable Injection

### Variable Syntax

Variables use Mustache-style syntax: `{{variable_name}}`

Supported patterns:
- Simple: `{{customer_name}}`
- Nested: `{{product.price}}`
- Credentials: `{{credentials.shopify}}`
- Environment: `{{env.API_URL}}`

### Injection Process

```typescript
class VariableInjector {
  inject(workflow: N8nWorkflow, context: InjectionContext): N8nWorkflow {
    // Clone workflow to avoid mutation
    const injected = JSON.parse(JSON.stringify(workflow));

    // Recursively replace variables in all node parameters
    for (const node of injected.nodes) {
      node.parameters = this.replaceVariables(node.parameters, context);
    }

    return injected;
  }

  private replaceVariables(obj: any, context: InjectionContext): any {
    if (typeof obj === 'string') {
      return this.replaceTokens(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariables(item, context));
    }

    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariables(value, context);
      }
      return result;
    }

    return obj;
  }

  private replaceTokens(text: string, context: InjectionContext): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.resolveVariable(path.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }
}
```

---

## Versioning System

### Database Schema

```sql
CREATE TABLE workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  blueprint JSONB NOT NULL,
  n8n_workflow JSONB NOT NULL,
  n8n_workflow_id VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES organization_members(id),
  deployed_at TIMESTAMPTZ,
  error_message TEXT,

  CONSTRAINT workflow_versions_bot_version_unique UNIQUE(bot_id, version)
);

CREATE INDEX idx_workflow_versions_bot ON workflow_versions(bot_id);
CREATE INDEX idx_workflow_versions_status ON workflow_versions(status);
```

### Version Lifecycle

```
draft → active → archived
  ↓       ↓
failed  failed
```

- **draft** - Created but not deployed
- **active** - Deployed and running in n8n
- **archived** - Replaced by newer version
- **failed** - Deployment failed

---

## n8n Integration

### n8n API Client

```typescript
class N8nClient {
  async createWorkflow(workflow: N8nWorkflow): Promise<string> {
    const response = await fetch(`${env.N8N_API_URL}/api/v1/workflows`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': env.N8N_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(workflow)
    });

    const data = await response.json();
    return data.id;
  }

  async activateWorkflow(id: string): Promise<void> {
    await fetch(`${env.N8N_API_URL}/api/v1/workflows/${id}/activate`, {
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': env.N8N_API_KEY
      }
    });
  }
}
```

---

## API Reference

### Create Workflow Version

```http
POST /api/bots/:botId/workflows
Content-Type: application/json

{
  "blueprint": { ... },
  "auto_deploy": true
}

Response:
{
  "success": true,
  "version": {
    "id": "wf_123",
    "bot_id": "bot_abc",
    "version": 1,
    "status": "active",
    "n8n_workflow_id": "n8n_456"
  }
}
```

### List Workflow Versions

```http
GET /api/bots/:botId/workflows

Response:
{
  "versions": [
    {
      "version": 2,
      "status": "active",
      "created_at": "2026-01-16T10:00:00Z"
    },
    {
      "version": 1,
      "status": "archived",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

### Activate Workflow Version

```http
POST /api/bots/:botId/workflows/:version/activate

Response:
{
  "success": true,
  "message": "Workflow version 1 activated"
}
```

---

## Examples

### Example 1: Simple Greeting Bot

See [Blueprint JSON Schema](#example-blueprint) above.

### Example 2: E-commerce Order Bot

```json
{
  "bot_id": "bot_ecommerce",
  "version": "1.0.0",
  "name": "Order Status Bot",
  "nodes": [
    {
      "id": "1",
      "type": "whatsapp_trigger",
      "config": { "keyword": "order" }
    },
    {
      "id": "2",
      "type": "ask_question",
      "config": {
        "question": "Please provide your order number:",
        "variable_name": "order_number",
        "timeout": 300
      }
    },
    {
      "id": "3",
      "type": "shopify_lookup",
      "config": {
        "order_id": "{{order_number}}"
      }
    },
    {
      "id": "4",
      "type": "if_condition",
      "config": {
        "left_value": "{{order.status}}",
        "operator": "equals",
        "right_value": "shipped"
      }
    },
    {
      "id": "5",
      "type": "whatsapp_reply",
      "config": {
        "message": "Your order is on the way! Tracking: {{order.tracking_number}}",
        "recipient": "{{customer_phone}}"
      }
    },
    {
      "id": "6",
      "type": "whatsapp_reply",
      "config": {
        "message": "Your order status: {{order.status}}",
        "recipient": "{{customer_phone}}"
      }
    }
  ],
  "edges": [
    { "id": "e1", "source": "1", "target": "2" },
    { "id": "e2", "source": "2", "target": "3" },
    { "id": "e3", "source": "3", "target": "4" },
    { "id": "e4", "source": "4", "target": "5", "sourceHandle": "true" },
    { "id": "e5", "source": "4", "target": "6", "sourceHandle": "false" }
  ],
  "variables": {},
  "credentials": [
    {
      "service": "shopify",
      "credential_id": "cred_shopify_123"
    }
  ]
}
```

---

## Testing

### Unit Tests

```typescript
describe('WorkflowCompiler', () => {
  test('compiles simple linear workflow', async () => {
    const blueprint: Blueprint = { ... };
    const result = await compiler.compile(blueprint);

    expect(result.success).toBe(true);
    expect(result.workflow.nodes).toHaveLength(2);
  });

  test('handles conditional branches', async () => {
    const blueprint: Blueprint = { ... };
    const result = await compiler.compile(blueprint);

    expect(result.workflow.connections['node_4']).toHaveProperty('true');
    expect(result.workflow.connections['node_4']).toHaveProperty('false');
  });
});
```

---

## Security

### Security Measures

1. **Credential Encryption** - AES-256 encryption for all credentials
2. **Input Validation** - Zod schemas on all endpoints
3. **SQL Injection Prevention** - Parameterized queries only
4. **XSS Prevention** - Sanitize all user input
5. **Rate Limiting** - Max 10 deployments per hour per bot
6. **Audit Logging** - Log all workflow changes with timestamps

---

## Progress

### Day 1: Architecture & Node Library ✅

**Completed:**
- ✅ Blueprint JSON schema defined (`src/types/workflow.ts`)
- ✅ Node Library service created (`src/services/node-library.ts`)
- ✅ 5 basic nodes implemented (trigger, reply, ask, condition, store)
- ✅ Node definitions JSON file (`src/data/node-library.json`)
- ✅ Documentation started (this file)

**Next Steps:**
- Day 2: Expand to 15+ nodes (integrations, utilities)
- Day 3: Build Workflow Compiler
- Day 4: Variable Injection & Security
- Day 5: Versioning & Database
- Day 6: n8n Integration
- Day 7: Testing & Polish

---

## Appendix

### Node Library JSON Schema

```json
{
  "version": "1.0.0",
  "nodes": {
    "node_type": {
      "id": "node_type",
      "type": "node_type",
      "category": "trigger|action|condition|integration|utility",
      "name": "Display Name",
      "description": "What this node does",
      "icon": "📱",
      "inputs": [ ... ],
      "outputs": [ ... ],
      "n8n_type": "n8n-nodes-base.nodeName",
      "n8n_template": { ... }
    }
  }
}
```

---

**Last Updated:** 2026-01-16
**Status:** Day 1 Complete ✅
**Next:** Day 2 - Node Library Expansion
