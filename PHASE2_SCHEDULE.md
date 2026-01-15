# Phase 2: The Intelligent Bot Factory 🏭
**Goal:** Transform BotFlow from a template deployer into an intelligent, dynamic workflow factory that builds custom solutions for clients automatically.

## Phase 2 Overview
- **Objective:** Enable clients to build "Truly Intelligent" bots that connect to their specific tools (Shopify, ShipLogic, etc.) via a simple Visual Wizard, which dynamically compiles into complex n8n workflows.
- **Duration:** 6 Weeks + Ongoing Testing
- **Core Technologies:** n8n (Advanced), pgvector (Supabase native), React/Next.js (Visual Builder), Node.js (Workflow Compiler).

---

## 🔒 Security & Infrastructure (Ongoing)
**Critical considerations maintained throughout all weeks:**
- [ ] **Credential Encryption**: All API keys encrypted at rest in database (AES-256)
- [ ] **Scoped Access**: n8n workflows only access credentials for their specific bot/organization
- [ ] **Audit Logging**: Track all workflow configuration changes with user attribution
- [ ] **Input Sanitization**: Prevent injection attacks in user-provided workflow data
- [ ] **Webhook Authentication**: Secure all n8n webhook triggers with HMAC signatures
- [ ] **Rate Limiting**: Protect API endpoints from abuse

---

## 📅 High-Level Schedule

### WEEK 1: The "Brain" (Knowledge Base & RAG) 🧠
**Goal:** Give bots the ability to "read" and "remember" by implementing Retrieval-Augmented Generation (RAG).
**Status:** ✅ 90% Complete | ⏳ Final Testing Phase

#### Completed (Days 1-3) ✅
- [x] **Infrastructure**: Enable pgvector extension in Supabase PostgreSQL (native, no external service!)
- [x] **Database Schema**: Create `knowledge_base_articles` and `knowledge_embeddings` tables with vector(1536) columns
- [x] **Backend API**: 7 REST endpoints for knowledge management with JWT auth (including search endpoint)
- [x] **Security**: HMAC webhook signatures for n8n integration
- [x] **Validation**: File size limits (10MB max), type validation (PDF, TXT, DOCX)
- [x] **Storage**: Supabase Storage bucket with signed URLs
- [x] **n8n Workflow Design**: 14-node workflow imported and configured in n8n Cloud
- [x] **Knowledge Search Service**: Semantic vector search with OpenAI embeddings
- [x] **Search API Endpoint**: POST /api/bots/:botId/knowledge/search with authentication
- [x] **RAG Integration**: Connected to WhatsApp message handler (both template & generic flows)
- [x] **Citation System**: Automatic "_💡 Based on uploaded documentation_" footer
- [x] **Metadata Tracking**: Track knowledge usage in message metadata
- [x] **Test Scripts**: Created PowerShell and Bash test scripts
- [x] **Error Handling**: Graceful degradation when knowledge search fails

#### In Progress (Day 4) ⏳
- [ ] **Real PDF Testing**: Upload and process actual PDF documents
- [ ] **Embeddings Verification**: Confirm vectors stored correctly in database
- [ ] **Search Quality Testing**: Test similarity thresholds and result relevance
- [ ] **WhatsApp E2E Test**: Send message via WhatsApp and verify cited response
- [ ] **Performance Optimization**: Query optimization and caching strategy
- [ ] **Multi-document Testing**: Test with multiple PDFs uploaded
- [ ] **Dashboard UI**: Frontend interface for knowledge base management (optional)

#### Result Target
A bot that can answer questions from uploaded PDFs with source citations

**Progress:** 90% Complete (Backend fully implemented, final testing and optimization remaining)

**Documentation:**
- [PHASE2_WEEK1_GUIDE.md](./PHASE2_WEEK1_GUIDE.md) - Week 1 overview
- [PHASE2_WEEK1.3_GUIDE.md](./PHASE2_WEEK1.3_GUIDE.md) - Implementation guide
- [PHASE2_WEEK1_RAG_COMPLETE.md](./PHASE2_WEEK1_RAG_COMPLETE.md) - Implementation summary
- [READY_TO_TEST.md](./READY_TO_TEST.md) - Quick start guide

### WEEK 2: The "Compiler" (Dynamic Workflow Engine) ⚙️
**Goal:** Build the backend engine that assembles unique n8n workflows on the fly.
- [ ] **Node Library**: Create "Code Modules" for standard tasks (e.g., "Ask Question", "Call API", "If/Then")
- [ ] **Assembly Logic**: Upgrade `workflow-generator.ts` to accept a "Blueprint JSON" and stitch nodes together
- [ ] **Variable Injection**: Implement robust system to inject Client Credentials (API Keys) into generated nodes safely
- [ ] **Workflow Versioning**: Preserve conversation history when regenerating workflows, don't break active bots
- [ ] **Dry-run Mode**: Test generated workflows without deploying to production
- [ ] **Rollback Capability**: Quick revert mechanism if compiled workflow has issues
- [ ] **Testing**: Unit tests for workflow compiler logic (5 test cases minimum)
- [ ] **Result**: A script that can generate 5 different bot variations based on 5 different input JSONs with version control

### WEEK 3: The Integrations Layer (eCommerce & Logistics) 🔌
**Goal:** Build the specific "Smart Modules" for the tools clients actually use.
- [ ] **Shopify Module**: "Check Stock", "Get Order Status", "Get Collections"
- [ ] **WooCommerce/OpenCart Module**: "Product Search", "Order Lookup"
- [ ] **ShipLogic/Courier Module**: "Track Shipment", "Get Shipping Quote"
- [ ] **Authentication Testing**: Automatic API key validation before saving credentials
- [ ] **Rate Limiting Awareness**: Handle API quotas gracefully (Shopify has strict limits)
- [ ] **Fallback System**: Zapier/Make.com webhook triggers for unsupported integrations
- [ ] **Error Handling**: Graceful degradation when third-party APIs are down
- [ ] **Testing**: Integration tests for each module with mock API responses
- [ ] **Result**: A production-ready library of "lego blocks" for eCommerce and Logistics with robust error handling

### WEEK 4: The Visual Builder (Frontend Wizard) 🧙‍♂️
**Goal:** Create the user-facing interface that captures intent.
- [ ] **Template Starting Points**: Let users start from existing templates, then customize (not blank canvas)
- [ ] **Wizard UI**: A tailored "Questionnaire" flow (e.g., "Do you want order tracking? Which provider?")
- [ ] **Configuration State**: Store the user's answers as the "Blueprint JSON"
- [ ] **Credential Connection**: Secure forms to collect and test API keys (e.g., "Connect Shopify" button with live validation)
- [ ] **Preview/Test Mode**: Let users test their bot configuration before going live
- [ ] **Validation Layer**: Prevent impossible workflows (e.g., missing required credentials, circular logic)
- [ ] **Progressive Disclosure**: Show advanced options only when needed
- [ ] **Result**: A beautiful Dashboard UI where users configure their bot's capabilities without seeing code, with guardrails

### WEEK 5: End-to-End Integration & "The Factory" 🏭
**Goal:** Connect the UI (Week 4) to the Compiler (Week 2) and the Brain (Week 1).
- [ ] **Full Flow**: UI Config -> Backend Compiler -> n8n Deployment -> WhatsApp Live
- [ ] **Multi-turn Logic**: Testing complex flows (e.g., "User asks for stock -> Bot checks Shopify -> User selects size -> Bot sends payment link")
- [ ] **Error Handling**: Graceful degradation when third-party APIs fail (fallback logic)
- [ ] **Migration Path**: Strategy for existing Phase 1 template bots (keep both systems or migrate?)
- [ ] **Load Testing**: Test with 100 concurrent bot conversations
- [ ] **Observability**: Error tracking, performance monitoring, conversation analytics
- [ ] **Beta Testing**: 3-5 real users testing in production with feedback loop
- [ ] **Result**: The first fully autonomous "Custom Bot Creation" by a real user with production monitoring

### WEEK 6: Polish, Scale & Launch 🚀
**Goal:** Production readiness and "Wow" factor.
- [ ] **Dashboard Analytics**: Show "Top Questions Asked", "Orders Processed", "Response Time" from n8n data
- [ ] **Visual "Map"**: Show the user a visual representation (readonly) of the bot workflow they built
- [ ] **Performance Optimization**: Database query optimization, caching strategy, CDN setup
- [ ] **Documentation**: User guides, API documentation, troubleshooting guides
- [ ] **Monitoring & Alerts**: Set up PagerDuty/Sentry for critical errors
- [ ] **Backup & Recovery**: Automated database backups, disaster recovery plan
- [ ] **Launch**: Deploy to production URLs with zero-downtime deployment strategy
- [ ] **Post-Launch**: 24-hour monitoring, hot-fix readiness

---

## 📂 Artifacts Strategy
We will maintain the `PHASE2_` prefix for clarity.
- `PHASE2_SCHEDULE.md` (This file)
- `PHASE2_WEEK1_GUIDE.md` - RAG implementation with pgvector
- `PHASE2_WEEK2_GUIDE.md` - Workflow compiler with versioning
- `PHASE2_WEEK3_GUIDE.md` - Integration modules with testing
- `PHASE2_WEEK4_GUIDE.md` - Visual builder with validation
- `PHASE2_WEEK5_GUIDE.md` - End-to-end integration with monitoring
- `PHASE2_WEEK6_GUIDE.md` - Launch readiness checklist
- `PHASE2_SECURITY.md` - Security best practices and audit log
- `PHASE2_TESTING.md` - Test coverage reports and QA procedures

---

## 🔄 Migration Strategy
**Handling existing Phase 1 template bots:**
- **Option A**: Run both systems in parallel (templates for simple bots, factory for custom)
- **Option B**: Migrate existing bots to new workflow system (requires conversion script)
- **Decision Point**: Week 5 after testing complexity

**Recommendation**: Option A initially - let users opt-in to "Upgrade to Custom Bot" feature

---

## 📊 Success Metrics
- **Week 1**: Bot can answer 90%+ questions correctly from uploaded PDF
- **Week 2**: Compiler generates valid workflows 100% of the time (no crashes)
- **Week 3**: All integration modules tested with real API credentials
- **Week 4**: 5 internal testers can build custom bot without documentation
- **Week 5**: 3-5 beta users successfully deploy production bots
- **Week 6**: Zero critical bugs in first 48 hours post-launch

---

## 🚨 Risk Mitigation
- **n8n dependency**: What if n8n service goes down? (Self-hosted backup instance)
- **OpenAI API limits**: Rate limiting and fallback to cheaper models
- **Database performance**: pgvector indexing strategy for scale (HNSW index)
- **User-generated workflows**: Sandbox execution environment to prevent abuse
- **Cost explosion**: Set hard limits on API calls per organization
