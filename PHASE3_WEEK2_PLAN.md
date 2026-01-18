# Phase 3 Week 2: Conversation System & Frontend

**Status:** COMPLETE
**Prerequisites:** Week 1 Complete (Agent Foundation)
**Completed:** January 18, 2026

---

## Overview

Week 2 focused on building the frontend chat interface and the conversation system. Users can now interact with the AI agent through a polished chat UI with real-time workflow preview.

## Implementation Summary

### Files Created

**Frontend Services:**
- `botflow-website/app/services/ai-agent.service.ts` - API service for all AI agent endpoints

**Custom Hooks:**
- `botflow-website/app/hooks/useAIAgent.ts` - State management for AI agent conversations

**AI Builder Page & Components:**
- `botflow-website/app/dashboard/bots/[id]/ai-builder/page.tsx` - Main page with split-panel layout
- `botflow-website/app/dashboard/bots/[id]/ai-builder/ChatPanel.tsx` - Chat interface
- `botflow-website/app/dashboard/bots/[id]/ai-builder/MessageBubble.tsx` - Message rendering
- `botflow-website/app/dashboard/bots/[id]/ai-builder/WorkflowPreview.tsx` - React Flow preview
- `botflow-website/app/dashboard/bots/[id]/ai-builder/SuggestedActions.tsx` - Quick actions/suggestions
- `botflow-website/app/dashboard/bots/[id]/ai-builder/EmptyState.tsx` - Empty state placeholder

### Features Implemented

1. **Split-Panel Layout** - Chat on left (50%), workflow preview on right (50%)
2. **Message Bubbles** - User messages (blue, right) and assistant messages (gray, left)
3. **Typing Indicator** - Animated dots while waiting for AI response
4. **Suggested Actions** - Quick reply chips below messages
5. **Workflow Preview** - Real-time React Flow visualization (reuses CustomNodes)
6. **Deploy Button** - One-click workflow deployment
7. **State Indicator** - Shows current conversation state (idle/gathering/confirming/etc.)
8. **Session Persistence** - Saves session to localStorage for refresh recovery
9. **Keyboard Shortcuts** - Enter to send, supports multi-line input

### Modified Files

- `botflow-website/app/dashboard/bots/[id]/page.tsx` - Added "AI Builder" button

---

---

## Completed in Week 1 (Reference)

The following backend components are ready to use:

### API Endpoints Available
```
POST /api/bots/:botId/agent/chat      - Send message, get response
POST /api/bots/:botId/agent/generate  - Direct workflow generation
POST /api/bots/:botId/agent/refine    - Refine existing workflow
POST /api/bots/:botId/agent/deploy    - Deploy workflow
GET  /api/bots/:botId/agent/session   - Get session info
DELETE /api/bots/:botId/agent/session/:sessionId - Delete session
GET  /api/bots/:botId/agent/explain   - Explain workflow
GET  /api/bots/:botId/agent/stats     - Usage statistics
```

### Backend Services
- `IntentParser` - Natural language understanding
- `ContextManager` - Session and state management
- `WorkflowGenerator` - Blueprint generation
- `ConversationEngine` - Main orchestrator

### Response Structure
```typescript
interface ChatResponse {
  message: string;           // AI response text
  sessionId: string;         // Session for continuation
  state: ConversationState;  // idle|gathering|confirming|refining|deploying|complete
  workflow?: Blueprint;      // Generated workflow (when available)
  actions: AgentAction[];    // Available actions (deploy, modify, etc.)
  suggestions?: string[];    // Quick reply suggestions
  questions?: AgentQuestion[]; // Follow-up questions
}
```

---

## Week 2 Tasks

### Day 1-2: Chat Interface Component

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/page.tsx`

Create the main AI builder page with split-panel layout:

```tsx
// Target structure
export default function AIBuilderPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left: Chat Panel (50%) */}
      <div className="w-1/2 border-r flex flex-col">
        <ChatHeader />
        <MessageList messages={messages} />
        <SuggestedActions suggestions={suggestions} onSelect={handleSelect} />
        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </div>

      {/* Right: Workflow Preview (50%) */}
      <div className="w-1/2 flex flex-col">
        {workflow ? (
          <WorkflowPreview workflow={workflow} />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
```

**Components to create:**

1. **ChatHeader** - Shows session info, state indicator, reset button
2. **MessageList** - Renders conversation with user/assistant bubbles
3. **ChatInput** - Text input with send button, loading state
4. **SuggestedActions** - Quick reply chips below messages
5. **MessageBubble** - Individual message with timestamp, typing indicator

**Styling:**
- Use existing Tailwind classes from the project
- Match the dashboard theme (dark sidebar, light content)
- Mobile-responsive (stack panels on small screens)

### Day 3-4: Workflow Preview Component

**File:** `botflow-website/app/dashboard/bots/[id]/ai-builder/WorkflowPreview.tsx`

Real-time workflow visualization using React Flow:

```tsx
interface WorkflowPreviewProps {
  workflow: Blueprint;
  onDeploy: () => void;
  onModify: (modification: string) => void;
}

function WorkflowPreview({ workflow, onDeploy, onModify }: WorkflowPreviewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* React Flow Canvas */}
      <div className="flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={convertToReactFlowNodes(workflow.nodes)}
            edges={convertToReactFlowEdges(workflow.edges)}
            nodeTypes={customNodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          />
        </ReactFlowProvider>
      </div>

      {/* Workflow Summary */}
      <WorkflowSummary workflow={workflow} />

      {/* Action Buttons */}
      <ActionBar onDeploy={onDeploy} onModify={onModify} />
    </div>
  );
}
```

**Reuse existing components from visual builder:**
- `CustomNodes.tsx` from `/dashboard/bots/[id]/workflow/`
- Node type definitions
- Edge styling

### Day 5: API Integration & State Management

**File:** `botflow-website/app/hooks/useAIAgent.ts`

Create a custom hook for AI agent interaction:

```typescript
interface UseAIAgentOptions {
  botId: string;
  onWorkflowGenerated?: (workflow: Blueprint) => void;
  onError?: (error: Error) => void;
}

interface UseAIAgentReturn {
  messages: Message[];
  workflow: Blueprint | null;
  state: ConversationState;
  sessionId: string | null;
  isLoading: boolean;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
  deploy: () => Promise<void>;
  undo: () => void;
}

export function useAIAgent(options: UseAIAgentOptions): UseAIAgentReturn {
  // Session management
  // Message handling
  // API calls
  // State updates
}
```

**API service file:** `botflow-website/app/services/ai-agent.service.ts`

```typescript
export const aiAgentService = {
  chat: (botId: string, message: string, sessionId?: string) =>
    api.post(`/bots/${botId}/agent/chat`, { message, sessionId }),

  generate: (botId: string, description: string) =>
    api.post(`/bots/${botId}/agent/generate`, { description }),

  deploy: (botId: string, sessionId: string) =>
    api.post(`/bots/${botId}/agent/deploy`, { sessionId, activate: true }),

  getSession: (botId: string, sessionId: string) =>
    api.get(`/bots/${botId}/agent/session?sessionId=${sessionId}`),

  deleteSession: (botId: string, sessionId: string) =>
    api.delete(`/bots/${botId}/agent/session/${sessionId}`)
};
```

### Day 6: Smart Prompts Enhancement (Backend)

**File:** `botflow-backend/src/prompts/ai-agent-prompts.ts`

Create dedicated prompts for the AI agent:

```typescript
export const AI_AGENT_PROMPTS = {
  // Prompt for understanding workflow modifications
  MODIFICATION_PARSER: `...`,

  // Prompt for generating clarifying questions
  QUESTION_GENERATOR: `...`,

  // Prompt for workflow explanation
  WORKFLOW_EXPLAINER: `...`,

  // Prompt for suggestion generation
  SUGGESTION_GENERATOR: `...`
};
```

**Enhance conversation responses:**
- More natural South African English
- Better question sequencing
- Context-aware suggestions

### Day 7: Testing & Polish

**Tasks:**
1. Test full conversation flow
2. Test workflow generation for different types
3. Test modification and refinement
4. Test deploy functionality
5. Fix any UI/UX issues
6. Add loading states and error handling
7. Add keyboard shortcuts (Enter to send, Esc to clear)

---

## File Structure

```
botflow-website/app/
├── dashboard/
│   └── bots/
│       └── [id]/
│           └── ai-builder/
│               ├── page.tsx              # Main page
│               ├── ChatPanel.tsx         # Left panel
│               ├── WorkflowPreview.tsx   # Right panel
│               ├── MessageBubble.tsx     # Message component
│               ├── SuggestedActions.tsx  # Quick replies
│               └── EmptyState.tsx        # No workflow state
├── hooks/
│   └── useAIAgent.ts                     # Custom hook
└── services/
    └── ai-agent.service.ts               # API service

botflow-backend/src/
└── prompts/
    └── ai-agent-prompts.ts               # Enhanced prompts
```

---

## API Response Examples

### Initial Message
```json
{
  "message": "Hi! I'm here to help you build a WhatsApp bot. What would you like it to do?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "idle",
  "actions": [],
  "suggestions": [
    "Track customer orders",
    "Book appointments",
    "Answer FAQs",
    "Process payments"
  ]
}
```

### After User Describes Intent
```json
{
  "message": "Great! So you want to track orders from Shopify. A few questions:\n\n1. How should customers identify their order - by order number or email?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "gathering",
  "actions": [],
  "suggestions": [
    "Order number",
    "Email address",
    "Both options"
  ],
  "questions": [
    {
      "id": "q_1",
      "text": "How should customers identify their order?",
      "type": "choice",
      "options": ["Order number", "Email address", "Both"],
      "required": true
    }
  ]
}
```

### Workflow Generated
```json
{
  "message": "I've created a workflow with 5 steps. Here's what it does:\n\n1. Listens for order tracking requests\n2. Asks for the order number\n3. Looks up the order in Shopify\n4. Formats the status message\n5. Sends the response\n\nReady to deploy?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "state": "confirming",
  "workflow": { /* Blueprint JSON */ },
  "actions": [
    { "type": "deploy", "label": "Deploy Now" },
    { "type": "modify", "label": "Make Changes" },
    { "type": "explain", "label": "Explain More" }
  ],
  "suggestions": [
    "Deploy it",
    "Add error handling",
    "Change the messages"
  ]
}
```

---

## UI/UX Guidelines

### Chat Panel
- Messages appear with smooth animation
- User messages aligned right, assistant left
- Typing indicator while waiting for response
- Timestamp on hover
- Quick replies as clickable chips

### Workflow Preview
- Auto-layout nodes for clean visualization
- Highlight nodes as they're discussed
- Show node details on hover
- Zoom controls (fit, zoom in/out)

### Mobile Experience
- Stack panels vertically on mobile
- Tab navigation between chat and preview
- Floating action buttons for deploy/modify

### Accessibility
- Keyboard navigation support
- Screen reader labels
- Focus management
- Color contrast compliance

---

## Testing Scenarios

### Happy Path
1. User opens AI builder
2. Describes "order tracking bot"
3. Answers 2-3 questions
4. Reviews generated workflow
5. Clicks deploy
6. Bot is live

### Modification Flow
1. User has workflow generated
2. Says "add email notification"
3. AI modifies workflow
4. User approves changes
5. Deploys updated workflow

### Error Recovery
1. User describes unclear intent
2. AI asks clarifying questions
3. User provides more details
4. Workflow generated successfully

### Undo Flow
1. User makes a modification
2. Decides it was wrong
3. Says "undo"
4. Previous version restored

---

## Success Criteria

- [ ] Chat interface renders correctly
- [ ] Messages display with proper styling
- [ ] Quick replies work as expected
- [ ] Workflow preview shows React Flow canvas
- [ ] API integration works end-to-end
- [ ] Session persists across page refresh
- [ ] Deploy saves workflow to database
- [ ] Mobile layout works properly
- [ ] Loading states show during API calls
- [ ] Error messages display gracefully

---

## Dependencies

**Frontend packages (already installed):**
- `reactflow` - Workflow visualization
- `tailwindcss` - Styling
- `lucide-react` - Icons

**Backend (no new dependencies needed)**

---

## Notes for Implementation

1. **Reuse existing code** - The visual workflow builder already has React Flow setup and custom nodes

2. **Session storage** - Consider using localStorage for sessionId to persist across refresh

3. **Optimistic updates** - Show user messages immediately, update with response

4. **Error boundaries** - Wrap components to catch and display errors gracefully

5. **Debounce input** - Prevent rapid API calls while typing

---

## Next Steps (Week 3)

After Week 2 is complete, Week 3 will focus on:
- Template library system
- Template database and seeding
- Template matching algorithm
- Template instantiation
