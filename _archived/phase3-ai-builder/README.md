# Phase 3: AI-Powered Workflow Builder (Archived)

**Archived Date:** January 2026

## Why This Was Archived

This code was archived because it contradicted BotFlow's core design philosophy as documented in `BOTFLOW_SYSTEM_WORKFLOW.md`:

> "Users **configure behavior**, they do **not build flows**."
>
> "BotFlow should feel like configuring a smart employee — not programming one."

The Phase 3 AI Builder system was building features that:
1. Let users build custom workflows (explicit non-goal)
2. Added complexity that 90% of SMB customers don't need
3. Distracted from the template-based approach that makes BotFlow simple

## What Was Archived

### Backend (`backend/`)
- `services/ai-agent/` - 16 service files for conversational workflow building
  - Intent parser (NLU)
  - Context manager (session state)
  - Workflow generator (GPT-4 powered)
  - Template matching
  - Error recovery
  - Pattern learning
  - And more...
- `routes/` - API endpoints for AI agent, workflow templates, health checks
- `types/ai-agent.ts` - 40+ TypeScript type definitions
- `data/workflow-templates/` - 12 workflow template JSON files
- `scripts/seed-workflow-templates.ts` - Database seeding script
- `migrations/` - Database migrations for workflow tables

### Frontend (`frontend/`)
- `ai-builder/` - Conversational AI builder UI
  - Chat panel
  - Template selector
  - Workflow preview
  - State indicators
- `workflow/` - Visual React Flow builder UI
  - Custom nodes
  - Node palette
  - Configuration panels

### Documentation (`docs/`)
- All PHASE3_*.md planning documents

## The Simplified Approach

BotFlow now follows the original vision:

1. **User picks a template** (taxi, salon, restaurant, etc.)
2. **User fills in configuration form** (business name, hours, services)
3. **Bot is live**

That's it. The AI handles conversations using:
- The template's system prompt
- The user's knowledge base content (PDFs, FAQs)

For users who need custom logic beyond templates → **that's the n8n premium tier**, not a core feature.

## If You Need This Code Later

This code is preserved and can be restored if needed. The architecture was:
- Well-typed (40+ TypeScript types)
- Well-tested patterns
- GPT-4o powered intent parsing and workflow generation

But it solved a problem most SMB customers don't have.
