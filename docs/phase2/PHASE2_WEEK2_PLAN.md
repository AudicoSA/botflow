# Phase 2 Week 2: Dynamic Workflow Engine - Comprehensive Plan

**Start Date:** Ready to begin
**Duration:** 5-7 days
**Goal:** Build the backend engine that assembles unique n8n workflows on the fly
**Prerequisites:** ✅ Week 1 Complete (RAG system working)

---

## 🎯 Week 2 Vision

**Transform this:**
```
User says: "I want a bot that checks Shopify stock and sends payment links"
```

**Into this:**
```json
{
  "nodes": [
    { "type": "trigger", "config": { "keyword": "order" } },
    { "type": "shopify_lookup", "credentials": "{{shopify_api_key}}" },
    { "type": "condition", "logic": "in_stock == true" },
    { "type": "paystack_link", "amount": "{{product.price}}" },
    { "type": "whatsapp_reply", "message": "Here's your payment link: {{link}}" }
  ],
  "edges": [ ... ]
}
```

**Which generates a working n8n workflow automatically!**

---

## 📋 Week 2 Deliverables

### 1. Node Library ✨
A collection of reusable workflow building blocks.

### 2. Workflow Compiler 🏭
Engine that converts Blueprint JSON → n8n workflow.

### 3. Variable Injection System 🔐
Safe credential and variable management.

### 4. Versioning System 📦
Track, rollback, and manage workflow versions.

### 5. Testing Infrastructure 🧪
Unit tests, integration tests, dry-run mode.

---

## 🗓️ Day-by-Day Breakdown

### Day 1: Architecture & Node Library Design

**Morning: Design Phase**
- [ ] Define Blueprint JSON schema
  ```typescript
  interface Blueprint {
    bot_id: string;
    version: string;
    nodes: Node[];
    edges: Edge[];
    variables: Record<string, string>;
    credentials: Credential[];
  }
  ```

- [ ] Design Node Library structure
  ```typescript
  interface NodeDefinition {
    id: string;
    type: string;
    category: 'trigger' | 'action' | 'condition' | 'integration';
    inputs: NodeInput[];
    outputs: NodeOutput[];
    n8n_template: object; // Base n8n node structure
  }
  ```

- [ ] Create node categories
  - **Triggers:** keyword, time, webhook
  - **Actions:** reply, ask, store
  - **Conditions:** if/then, switch, filter
  - **Integrations:** shopify, paystack, logistics

**Afternoon: Implementation Start**
- [ ] Create `src/services/node-library.ts`
  ```typescript
  export class NodeLibrary {
    getNode(type: string): NodeDefinition;
    listNodes(category?: string): NodeDefinition[];
    validateNode(node: Node): boolean;
  }
  ```

- [ ] Implement first 5 basic nodes:
  1. **WhatsApp Trigger** - Listen for messages
  2. **WhatsApp Reply** - Send message back
  3. **Ask Question** - Prompt user for input
  4. **If/Then Condition** - Branch logic
  5. **Store Variable** - Save to memory

- [ ] Create node definitions JSON file
  ```json
  {
    "nodes": {
      "whatsapp_trigger": {
        "n8n_type": "n8n-nodes-base.webhook",
        "template": { ... }
      },
      ...
    }
  }
  ```

**Evening: Documentation**
- [ ] Create `PHASE2_WEEK2_GUIDE.md`
- [ ] Document Blueprint JSON schema
- [ ] Document NodeDefinition structure

---

### Day 2: Node Library Expansion

**Goal:** Build out 15+ reusable nodes

**Morning: Core Nodes (5 nodes)**
- [ ] **Variable Assignment** - Set variables
- [ ] **Text Manipulation** - Concat, replace, format
- [ ] **Math Operations** - Calculate, sum, multiply
- [ ] **HTTP Request** - Generic API call
- [ ] **Database Query** - PostgreSQL lookup

**Afternoon: Integration Nodes (5 nodes)**
- [ ] **Shopify Product Lookup** - Get product info
- [ ] **Shopify Stock Check** - Check inventory
- [ ] **Paystack Payment Link** - Generate payment
- [ ] **Knowledge Base Search** - RAG search (Week 1!)
- [ ] **OpenAI Chat** - Custom GPT call

**Evening: Advanced Nodes (5 nodes)**
- [ ] **Loop** - Iterate over list
- [ ] **Switch/Case** - Multiple conditions
- [ ] **Delay** - Wait X seconds
- [ ] **Error Handler** - Try/catch logic
- [ ] **Webhook Callback** - Notify external service

**Testing:**
- [ ] Unit test each node's n8n template generation
- [ ] Verify all nodes have valid JSON
- [ ] Test node validation function

---

### Day 3: Workflow Compiler Core

**Goal:** Build the engine that stitches nodes together

**Morning: Compiler Architecture**
- [ ] Create `src/services/workflow-compiler.ts`
  ```typescript
  export class WorkflowCompiler {
    compile(blueprint: Blueprint): n8nWorkflow;
    validate(blueprint: Blueprint): ValidationResult;
    generateNodeId(): string;
    connectNodes(from: Node, to: Node): Edge;
  }
  ```

- [ ] Implement Blueprint → n8n conversion
  - Map Blueprint nodes → n8n nodes
  - Generate unique node IDs
  - Create node connections (edges)
  - Set node positions on canvas

**Afternoon: Node Connection Logic**
- [ ] Implement edge creation algorithm
  ```typescript
  function createEdge(source: Node, target: Node): n8nEdge {
    return {
      source: source.id,
      target: target.id,
      sourceHandle: 'output',
      targetHandle: 'input'
    };
  }
  ```

- [ ] Handle conditional branches (if/then splits)
- [ ] Handle loops (iterate and exit conditions)
- [ ] Handle error paths (try/catch routing)

**Evening: Canvas Positioning**
- [ ] Auto-layout algorithm (horizontal flow)
  ```typescript
  function calculateNodePosition(index: number): { x: number, y: number } {
    return {
      x: 300 + (index * 250), // Horizontal spacing
      y: 300                   // Vertical center
    };
  }
  ```

- [ ] Handle branching (vertical splits)
- [ ] Handle loops (circular layout detection)

---

### Day 4: Variable Injection & Security

**Goal:** Safely inject credentials and variables

**Morning: Variable System**
- [ ] Create `src/services/variable-injector.ts`
  ```typescript
  export class VariableInjector {
    inject(workflow: n8nWorkflow, variables: Variables): n8nWorkflow;
    replaceTokens(text: string, vars: Record<string, string>): string;
    validateVariables(required: string[], provided: string[]): boolean;
  }
  ```

- [ ] Implement token replacement
  ```typescript
  // Replace {{variable}} with actual values
  replaceTokens("Hello {{name}}", { name: "John" })
  // → "Hello John"
  ```

- [ ] Handle nested variables
  ```typescript
  "{{product.price}}" → product.price
  "{{user.phone_number}}" → user.phone_number
  ```

**Afternoon: Credential Management**
- [ ] Create database table for workflow credentials
  ```sql
  CREATE TABLE workflow_credentials (
    id UUID PRIMARY KEY,
    bot_id UUID REFERENCES bots(id),
    service VARCHAR(50), -- 'shopify', 'paystack', etc.
    credentials JSONB,   -- Encrypted
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

- [ ] Implement credential encryption
  ```typescript
  function encryptCredentials(data: object): string {
    // Use AES-256 encryption
    return encrypt(JSON.stringify(data), process.env.ENCRYPTION_KEY);
  }
  ```

- [ ] Implement credential injection
  ```typescript
  // Replace {{credentials.shopify}} with actual API key
  inject("{{credentials.shopify}}", bot)
  // → "sk_live_abc123xyz"
  ```

**Evening: Security Validation**
- [ ] Prevent code injection attacks
- [ ] Validate all variable names (alphanumeric only)
- [ ] Sanitize user input
- [ ] Rate limiting on workflow creation

---

### Day 5: Versioning & Database Layer

**Goal:** Track workflow versions and enable rollback

**Morning: Database Schema**
- [ ] Create `workflow_versions` table
  ```sql
  CREATE TABLE workflow_versions (
    id UUID PRIMARY KEY,
    bot_id UUID REFERENCES bots(id),
    version INTEGER,
    blueprint JSONB,        -- Original Blueprint
    n8n_workflow JSONB,     -- Generated n8n workflow
    n8n_workflow_id VARCHAR(100), -- n8n's workflow ID
    status VARCHAR(20),     -- 'draft', 'active', 'archived'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES organization_members(id)
  );

  CREATE INDEX idx_workflow_versions_bot ON workflow_versions(bot_id);
  CREATE INDEX idx_workflow_versions_status ON workflow_versions(status);
  ```

- [ ] Create API routes for versioning
  ```typescript
  POST   /api/bots/:botId/workflows          // Create new version
  GET    /api/bots/:botId/workflows          // List versions
  GET    /api/bots/:botId/workflows/:version // Get specific version
  POST   /api/bots/:botId/workflows/:version/activate  // Activate version
  POST   /api/bots/:botId/workflows/:version/rollback  // Rollback
  DELETE /api/bots/:botId/workflows/:version // Archive version
  ```

**Afternoon: Versioning Logic**
- [ ] Implement version creation
  ```typescript
  async function createVersion(botId: string, blueprint: Blueprint) {
    const latestVersion = await getLatestVersion(botId);
    const newVersion = latestVersion + 1;

    const n8nWorkflow = compiler.compile(blueprint);

    await db.insert('workflow_versions', {
      bot_id: botId,
      version: newVersion,
      blueprint,
      n8n_workflow: n8nWorkflow,
      status: 'draft'
    });
  }
  ```

- [ ] Implement rollback
  ```typescript
  async function rollback(botId: string, targetVersion: number) {
    const version = await getVersion(botId, targetVersion);

    // Deactivate current
    await updateStatus(botId, 'current', 'archived');

    // Activate target
    await updateStatus(botId, targetVersion, 'active');

    // Deploy to n8n
    await deployToN8n(version.n8n_workflow);
  }
  ```

**Evening: Testing**
- [ ] Test version creation
- [ ] Test version listing
- [ ] Test activation
- [ ] Test rollback

---

### Day 6: n8n Integration & Deployment

**Goal:** Deploy compiled workflows to n8n

**Morning: n8n API Client**
- [ ] Create `src/services/n8n-client.ts`
  ```typescript
  export class N8nClient {
    createWorkflow(workflow: n8nWorkflow): Promise<string>; // Returns workflow_id
    updateWorkflow(id: string, workflow: n8nWorkflow): Promise<void>;
    deleteWorkflow(id: string): Promise<void>;
    activateWorkflow(id: string): Promise<void>;
    getWorkflow(id: string): Promise<n8nWorkflow>;
  }
  ```

- [ ] Implement n8n API calls
  ```typescript
  async createWorkflow(workflow: n8nWorkflow): Promise<string> {
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
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
  ```

**Afternoon: Deployment Pipeline**
- [ ] Implement deployment workflow
  ```typescript
  async function deployWorkflow(botId: string, version: number) {
    // 1. Get version from database
    const versionData = await getVersion(botId, version);

    // 2. Create workflow in n8n
    const n8nWorkflowId = await n8nClient.createWorkflow(
      versionData.n8n_workflow
    );

    // 3. Save n8n workflow ID
    await updateVersion(botId, version, { n8n_workflow_id: n8nWorkflowId });

    // 4. Activate workflow
    await n8nClient.activateWorkflow(n8nWorkflowId);

    // 5. Update status
    await updateVersion(botId, version, { status: 'active' });
  }
  ```

- [ ] Implement update workflow
- [ ] Implement delete workflow

**Evening: Error Handling**
- [ ] Handle n8n API errors
- [ ] Retry logic for transient failures
- [ ] Rollback on deployment failure

---

### Day 7: Testing, Documentation & Polish

**Goal:** Comprehensive testing and documentation

**Morning: Testing Infrastructure**
- [ ] Create `test-workflow-compiler.ts`
  ```typescript
  describe('WorkflowCompiler', () => {
    test('compiles simple workflow', () => { ... });
    test('handles conditional branches', () => { ... });
    test('handles loops', () => { ... });
    test('validates blueprint', () => { ... });
  });
  ```

- [ ] Create integration tests
  ```typescript
  describe('Workflow Integration', () => {
    test('end-to-end: blueprint → n8n → deployed', async () => {
      const blueprint = createTestBlueprint();
      const workflow = compiler.compile(blueprint);
      const id = await n8nClient.createWorkflow(workflow);
      expect(id).toBeDefined();
    });
  });
  ```

- [ ] Create dry-run mode
  ```typescript
  function dryRun(blueprint: Blueprint): CompilationResult {
    const workflow = compiler.compile(blueprint);
    const validation = compiler.validate(blueprint);

    return {
      success: validation.valid,
      workflow: workflow,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
  ```

**Afternoon: Documentation**
- [ ] Complete `PHASE2_WEEK2_GUIDE.md`
  - Architecture overview
  - Node library reference
  - Compiler algorithm explanation
  - API documentation
  - Examples

- [ ] Create `PHASE2_WEEK2_TESTING.md`
  - Test procedures
  - Expected results
  - Troubleshooting

- [ ] Create Blueprint JSON examples
  ```json
  // examples/simple-bot.json
  // examples/ecommerce-bot.json
  // examples/conditional-bot.json
  ```

**Evening: Polish & Review**
- [ ] Code review all Week 2 code
- [ ] Optimize performance (if needed)
- [ ] Update `PHASE2_PROGRESS.md`
- [ ] Create `PHASE2_WEEK2_COMPLETE.md`

---

## 📁 Files to Create

### Backend Services (5 files)
```
src/services/
├── node-library.ts         (~200 lines) - Node definitions
├── workflow-compiler.ts    (~300 lines) - Blueprint → n8n
├── variable-injector.ts    (~150 lines) - Variable replacement
├── n8n-client.ts           (~200 lines) - n8n API client
└── workflow-validator.ts   (~150 lines) - Blueprint validation
```

### Database Migration (1 file)
```
botflow-backend/migrations/
└── 002_workflow_engine.sql (~200 lines)
    - workflow_versions table
    - workflow_credentials table
    - Indexes and RLS policies
```

### API Routes (1 file)
```
src/routes/
└── workflows.ts            (~400 lines)
    - CRUD for workflow versions
    - Deployment endpoints
    - Testing/dry-run endpoint
```

### Node Definitions (1 file)
```
src/data/
└── node-library.json       (~500 lines)
    - 15+ node definitions
    - n8n templates
    - Validation rules
```

### Tests (3 files)
```
src/tests/
├── node-library.test.ts        (~150 lines)
├── workflow-compiler.test.ts   (~200 lines)
└── workflow-integration.test.ts (~100 lines)
```

### Documentation (4 files)
```
├── PHASE2_WEEK2_GUIDE.md         (~800 lines)
├── PHASE2_WEEK2_TESTING.md       (~400 lines)
├── PHASE2_WEEK2_COMPLETE.md      (~300 lines)
└── examples/
    ├── simple-bot.json
    ├── ecommerce-bot.json
    └── conditional-bot.json
```

**Total Estimated Lines:** ~3,550 lines (code + tests + docs)

---

## 🎯 Success Criteria

### Functional Requirements
- [ ] Compiler generates valid n8n workflows 100% of time
- [ ] At least 15 reusable node types created
- [ ] Variable injection works securely
- [ ] Versioning and rollback working
- [ ] Credentials encrypted in database
- [ ] Workflows deploy to n8n successfully

### Non-Functional Requirements
- [ ] Compilation time <2 seconds
- [ ] Test coverage >80%
- [ ] Comprehensive documentation
- [ ] Error handling on all API calls
- [ ] Logging for debugging

### Security Requirements
- [ ] No code injection vulnerabilities
- [ ] Credentials encrypted at rest
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] Audit logging for workflow changes

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Node Library
test('getNode returns valid node definition')
test('validateNode catches invalid nodes')

// Compiler
test('compile simple linear workflow')
test('compile workflow with conditions')
test('compile workflow with loops')
test('handles invalid blueprint gracefully')

// Variable Injector
test('replaces simple variables')
test('replaces nested variables')
test('handles missing variables')
```

### Integration Tests
```typescript
// End-to-End
test('blueprint → compile → deploy → n8n')
test('create version → activate → rollback')
test('deploy → test → update → redeploy')
```

### Manual Tests
```bash
# Create simple workflow
curl -X POST /api/bots/{id}/workflows \
  -d @examples/simple-bot.json

# Deploy workflow
curl -X POST /api/bots/{id}/workflows/1/deploy

# Test in n8n
# Trigger webhook and verify execution

# Rollback
curl -X POST /api/bots/{id}/workflows/1/rollback
```

---

## 📊 Expected Metrics

### Performance
| Operation | Target | Acceptable |
|-----------|--------|------------|
| Compile Blueprint | <1s | <2s |
| Deploy to n8n | <3s | <5s |
| Version List | <200ms | <500ms |
| Rollback | <5s | <10s |

### Code Quality
- **Test Coverage:** >80%
- **Type Safety:** 100% (TypeScript)
- **Linting:** 0 errors
- **Documentation:** Every function

---

## 🔐 Security Checklist

- [ ] All credentials encrypted (AES-256)
- [ ] No credentials in logs
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitize all user input)
- [ ] Rate limiting (max 10 deployments/hour)
- [ ] Audit logging (who deployed what when)
- [ ] Secrets in environment variables (not code)

---

## 💡 Implementation Tips

### 1. Start Simple
Don't try to build all 15 nodes on Day 2. Start with 3-5 basic ones and expand.

### 2. Test Early, Test Often
Write tests alongside code, not after. This catches bugs early.

### 3. Use Type Safety
Define TypeScript interfaces for everything:
```typescript
interface Blueprint { ... }
interface NodeDefinition { ... }
interface n8nWorkflow { ... }
```

### 4. Follow Week 1 Patterns
- HMAC security for webhooks
- RLS policies for multi-tenancy
- Structured logging
- Error handling with try-catch

### 5. Document As You Go
Don't wait until Day 7. Write docs alongside implementation.

---

## 🚀 Quick Start for New Chat

When you start Week 2 in a new chat, paste this:

```
I'm ready to start Phase 2 Week 2: Dynamic Workflow Engine.

Context:
- Phase 2 Week 1 (RAG system) is complete ✅
- I have PHASE2_SUMMARY.md with full context
- I have PHASE2_WEEK2_PLAN.md with detailed plan

Goal: Build the backend engine that compiles Blueprint JSON into n8n workflows.

Deliverables:
1. Node Library (15+ reusable nodes)
2. Workflow Compiler (Blueprint → n8n)
3. Variable Injection System (credentials + variables)
4. Versioning System (rollback capability)
5. Testing Infrastructure (unit + integration)

Timeline: 5-7 days
Success Criteria: Generate valid n8n workflows 100% of the time

Ready to start with Day 1: Architecture & Node Library Design.

Please read PHASE2_WEEK2_PLAN.md and confirm you understand the scope, then let's begin!
```

---

## 📚 Reference Materials

### Week 1 Patterns to Reuse
- `src/services/knowledge-search.ts` - Service pattern
- `src/routes/knowledge.ts` - API route pattern
- `migrations/001_pgvector_knowledge_base.sql` - Migration pattern
- HMAC security implementation
- RLS policy patterns

### n8n Resources
- [n8n API Documentation](https://docs.n8n.io/api/)
- [n8n Workflow Structure](https://docs.n8n.io/integrations/creating-nodes/build/declarative-style-node/)
- n8n Cloud instance (if available)

### External References
- Blueprint JSON schema (to be defined)
- Node definitions reference
- Variable syntax specification

---

## ✨ Week 2 Vision Statement

> "Turn user intent into working bots automatically. No code, no complexity, just configuration."

By the end of Week 2, you'll have a system that:
- ✅ Accepts Blueprint JSON from UI
- ✅ Compiles it into valid n8n workflows
- ✅ Deploys to n8n automatically
- ✅ Manages versions and rollbacks
- ✅ Injects credentials securely
- ✅ Handles 15+ node types

**This is the foundation for the Visual Builder (Week 4)!**

---

## 🎉 Let's Build Week 2!

Week 1 gave bots a **brain** (RAG).
Week 2 gives bots **muscles** (dynamic workflows).

**Ready to code?** 💪

Start with Day 1: Architecture & Node Library Design.

Good luck! 🚀

---

**Created:** 2026-01-16
**Status:** Ready to implement
**Prerequisites:** ✅ Week 1 Complete
**Estimated Completion:** 5-7 days from start

---

> "From templates to factories. Let's build the engine!" ⚙️
