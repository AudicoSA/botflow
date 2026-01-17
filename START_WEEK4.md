# Start Here: Phase 2 Week 4 - Visual Bot Builder UI 🎨

**Date:** 2026-01-16
**Context:** Phase 2 Week 3 (Intelligent Bot Builder) COMPLETE! ✅

---

## 🎯 Quick Context

### What's Been Built (Weeks 1-3)

**Week 1: Knowledge Base & RAG** ✅
- Bots can read PDFs and answer with citations
- pgvector semantic search
- Backend PDF processor (no n8n dependency)

**Week 2: Dynamic Workflow Engine** ✅
- 15-node library for bot building
- Workflow Compiler (Blueprint → n8n)
- Variable injection system
- Auto-layout algorithm

**Week 3: Intelligent Bot Builder** ✅
- GPT-4 powered intent analysis
- Natural language → Blueprint JSON
- Conversational bot building
- Node recommendations
- Optimization suggestions

### Key Files

```
botflow-backend/src/
├── prompts/
│   └── bot-builder-prompts.ts        ✅ AI prompts
├── services/
│   ├── bot-builder.service.ts        ✅ Core bot builder
│   ├── node-recommendation.service.ts ✅ Node recommendations
│   ├── node-library.ts               ✅ 15 node types
│   ├── workflow-compiler.ts          ✅ Blueprint → n8n
│   └── variable-injector.ts          ✅ Variable replacement
└── routes/
    ├── bot-builder.ts                ✅ 5 API endpoints
    └── workflows.ts                  ✅ Workflow CRUD
```

### Current State

**Backend:** Fully functional ✅
- 5 bot-builder endpoints
- Intent analysis (~2.5s)
- Blueprint generation (~4s)
- Node recommendations (<0.1s)
- Cost: $0.036 per bot

**Frontend:** Basic dashboard exists, NO bot builder UI yet ❌

---

## 🚀 Week 4 Goal: Visual Bot Builder UI

**Goal:** Create user-facing UI for bot configuration that leverages Week 3's intelligent backend.

### What to Build

**Option A: AI-First Interface (RECOMMENDED)**
Build a conversational interface that uses Week 3's intelligent builder:

1. **Chat-Based Builder**
   - Text input for bot description
   - Real-time intent analysis
   - Show recommended nodes as user types
   - Preview Blueprint in visual format
   - "Refine" mode for tweaks

2. **Visual Preview**
   - React Flow canvas (read-only initially)
   - Shows generated Blueprint
   - Node type icons and labels
   - Connection lines with labels

3. **Configuration Panel**
   - Edit node configs
   - Test connections
   - Add credentials
   - Deploy button

**Option B: Traditional Visual Builder**
Drag-and-drop interface (more work, but full control):

1. **Node Palette**
   - 15 node types from library
   - Search and filter
   - Drag to canvas

2. **Canvas**
   - React Flow
   - Node positioning
   - Connection drawing
   - Auto-layout

3. **Properties Panel**
   - Edit selected node
   - Config forms
   - Validation

**RECOMMENDATION:** Start with Option A (AI-First) because:
- Leverages Week 3 intelligence
- Faster to build
- Better UX for non-technical users
- Can add drag-and-drop later

---

## 📋 Week 4 Tasks (Option A: AI-First)

### Day 1-2: Chat Interface
- [ ] Create `/dashboard/bots/[id]/builder` page
- [ ] Chat input component
- [ ] Message display (user + assistant)
- [ ] Call `POST /api/bots/:id/builder/conversation`
- [ ] Show loading states

### Day 3-4: Visual Preview
- [ ] Install React Flow (`npm install reactflow`)
- [ ] Blueprint → React Flow conversion
- [ ] Node rendering with custom styles
- [ ] Edge rendering
- [ ] Auto-layout positioning

### Day 5-6: Configuration & Testing
- [ ] Node configuration modal
- [ ] Credential management UI
- [ ] Test mode (simulate messages)
- [ ] Deploy button
- [ ] Success/error handling

### Day 7: Polish & Documentation
- [ ] Mobile responsive
- [ ] Loading skeletons
- [ ] Error messages
- [ ] Help text and tooltips
- [ ] Documentation

---

## 🎨 UI Design Mockup

```
┌─────────────────────────────────────────────────────────┐
│  BotFlow / Dashboard / Bots / Order Bot / Builder       │
└─────────────────────────────────────────────────────────┘

┌───────────────────────────┬─────────────────────────────┐
│  Chat Builder             │  Blueprint Preview          │
├───────────────────────────┼─────────────────────────────┤
│                           │                             │
│  Bot: What should your   │   ┌──────────┐              │
│       bot do?            │   │ Trigger  │              │
│                           │   └────┬─────┘              │
│  You: Track orders from  │        │                     │
│       Shopify            │   ┌────▼─────┐              │
│                           │   │   Ask    │              │
│  Bot: Got it! I'll need: │   └────┬─────┘              │
│       - Shopify API key  │        │                     │
│       - Order lookup     │   ┌────▼─────┐              │
│       - Status display   │   │ Shopify  │              │
│                           │   └────┬─────┘              │
│  [Type your message...]  │        │                     │
│  [or]                    │   ┌────▼─────┐              │
│  [Generate from text ↗]  │   │  Reply   │              │
│                           │   └──────────┘              │
│                           │                             │
│                           │  Confidence: 92%            │
│                           │  [Configure] [Deploy]       │
└───────────────────────────┴─────────────────────────────┘
```

---

## 💻 Example API Calls

### 1. Start Conversation

```typescript
const response = await fetch(`/api/bots/${botId}/builder/conversation`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'I want to make a bot for order tracking' }
    ]
  })
});

const data = await response.json();
// { success: true, response: "Great! Where do you store orders?", complete: false }
```

### 2. Generate from Description

```typescript
// Step 1: Analyze intent
const intent = await fetch(`/api/bots/${botId}/builder/analyze`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    description: 'Bot that asks for order number and looks it up in Shopify'
  })
});

// Step 2: Generate Blueprint
const blueprint = await fetch(`/api/bots/${botId}/builder/generate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    intent: intent.intent
  })
});

// { success: true, blueprint: {...}, confidence: 0.92, warnings: [], suggestions: [...] }
```

### 3. Get Node Recommendations

```typescript
const recs = await fetch(`/api/bots/${botId}/builder/recommend`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'send payment link',
    context: {
      previousNodes: ['ask_question'],
      integrations: ['paystack']
    }
  })
});

// { success: true, recommendations: [{ node_type: 'paystack_payment', confidence: 0.95, ... }] }
```

---

## 🔧 Tech Stack

### Frontend Dependencies

```bash
cd botflow-website
npm install reactflow         # Visual workflow canvas
npm install @radix-ui/react-*  # UI components (dialog, select, etc.)
npm install lucide-react       # Icons
npm install clsx              # Class name utilities
```

### Key Libraries

- **React Flow** - Visual workflow canvas
- **Radix UI** - Headless UI components
- **TailwindCSS** - Styling (already installed)
- **Lucide React** - Icons (already installed)
- **Next.js 15** - Framework (already installed)

---

## 📚 Documentation to Read

1. **[PHASE2_WEEK3_COMPLETE.md](./PHASE2_WEEK3_COMPLETE.md)** - Week 3 summary
2. **[PHASE2_SUMMARY.md](./PHASE2_SUMMARY.md)** - Overall Phase 2 progress
3. **[PHASE2_WEEK3_GUIDE.md](./PHASE2_WEEK3_GUIDE.md)** - Implementation details
4. **React Flow Docs** - https://reactflow.dev/
5. **[botflow-backend/src/routes/bot-builder.ts](./botflow-backend/src/routes/bot-builder.ts)** - API endpoints

---

## ✅ Success Criteria

### Functional Requirements
- [ ] Users can describe bots in natural language
- [ ] System generates Blueprint automatically
- [ ] Visual preview shows workflow structure
- [ ] Users can edit node configurations
- [ ] Users can deploy bots
- [ ] Works on desktop and mobile

### Non-Functional Requirements
- [ ] UI response time <100ms
- [ ] Blueprint generation <5s (backend already meets this)
- [ ] Mobile responsive
- [ ] Accessible (keyboard navigation, screen readers)
- [ ] Error handling with clear messages

### User Experience
- [ ] Intuitive for non-technical users
- [ ] Clear visual feedback
- [ ] Helpful error messages
- [ ] Progress indicators
- [ ] Undo/redo support (nice to have)

---

## 🎉 Week 3 Achievements

**What We Accomplished:**
- ✅ GPT-4 powered intent analysis
- ✅ Natural language → Blueprint JSON
- ✅ Conversational bot building
- ✅ Node recommendations
- ✅ Optimization suggestions
- ✅ 5 API endpoints
- ✅ Comprehensive testing
- ✅ Full documentation

**Performance:**
- Intent Analysis: 2.5s ✅
- Blueprint Generation: 4s ✅
- Cost per bot: $0.036 ✅

**Code:**
- 4,150 lines of code
- 25+ tests (100% pass rate)
- 1,500 lines of documentation

---

## 🚀 Quick Start Command

```bash
# For new chat session, say:
"I'm ready to build Phase 2 Week 4: Visual Bot Builder UI.

Context:
- Week 1 (RAG) ✅
- Week 2 (Workflow Engine) ✅
- Week 3 (Intelligent Bot Builder) ✅

I want to build an AI-first conversational interface that uses the Week 3 intelligent backend.

Read START_WEEK4.md and let's start with Day 1: Chat Interface.

Please read the bot-builder API routes and create the chat-based builder page."
```

---

**Let's build something amazing!** 🎨✨
