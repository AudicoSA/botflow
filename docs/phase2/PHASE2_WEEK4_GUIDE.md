# Phase 2 Week 4: The Visual Builder (Frontend Wizard) - Implementation Guide

**Status:** Ready to Start 🚀
**Goal:** Create the user-facing interface that captures intent without showing code
**Duration:** 5-7 days
**Prerequisites:** ✅ Week 1 (RAG) + ✅ Week 2 (Workflow Engine) + ✅ Week 3 (Intelligent Bot Builder)

---

## 📚 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [UI/UX Design Principles](#uiux-design-principles)
4. [Component Library](#component-library)
5. [Template-Based Workflow](#template-based-workflow)
6. [Wizard Flow](#wizard-flow)
7. [Credential Management](#credential-management)
8. [Blueprint Preview](#blueprint-preview)
9. [Validation Layer](#validation-layer)
10. [State Management](#state-management)
11. [API Integration](#api-integration)
12. [Testing Strategy](#testing-strategy)
13. [Day-by-Day Plan](#day-by-day-plan)

---

## Overview

### What We're Building

Week 4 creates the beautiful, intuitive interface that lets users build custom bots without writing code:

**From This (Technical):**
```json
{
  "nodes": [
    { "id": "1", "type": "whatsapp_trigger", ... },
    { "id": "2", "type": "shopify_lookup", ... }
  ]
}
```

**To This (Visual):**
```
┌─────────────────────────────────────────┐
│  🛍️  Build Your E-commerce Bot          │
├─────────────────────────────────────────┤
│                                         │
│  What should trigger your bot?          │
│  ○ Customer says a keyword              │
│  ● Any customer message                 │
│  ○ Webhook from your store              │
│                                         │
│  Which e-commerce platform?             │
│  ☑️ Shopify [Connected ✓]              │
│  ☐ WooCommerce                         │
│  ☐ Custom API                          │
│                                         │
│  [Continue] [Save Draft]                │
└─────────────────────────────────────────┘
```

### The Magic ✨

Users interact with a conversational wizard that:
1. **Asks smart questions** - Context-aware, progressive disclosure
2. **Tests connections** - Live validation of API credentials
3. **Shows preview** - Visual workflow diagram (read-only)
4. **Prevents errors** - Validation before deployment
5. **Feels natural** - Like talking to a consultant, not filling forms

---

## Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────┐
│                    User (Browser)                          │
│             Next.js App + React Components                 │
└───────────────────────────┬────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Bot Builder Wizard     │  │   Blueprint Preview      │
│   - Multi-step form      │  │   - Visual workflow map  │
│   - Smart questions      │  │   - Read-only diagram    │
│   - Live validation      │  │   - Node details         │
└──────────┬───────────────┘  └──────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│              State Management (Zustand/Context)            │
│   - Wizard progress                                        │
│   - Form data                                              │
│   - Validation state                                       │
│   - Credential status                                      │
└───────────────────────────┬────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  API Client (Frontend)   │  │   Local Validation       │
│  - Bot Builder API       │  │   - Form validation      │
│  - Template API          │  │   - Credential testing   │
│  - Credential API        │  │   - Blueprint validation │
└──────────┬───────────────┘  └──────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────┐
│                  Backend APIs (Week 2 + 3)                 │
│   POST /api/bots/:id/builder/analyze                      │
│   POST /api/bots/:id/builder/generate                     │
│   POST /api/bots/:id/builder/conversation                 │
│   POST /api/workflows/compile                             │
│   POST /api/integrations/:service/test                    │
└────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Selection** → Template or custom start
2. **Wizard Questions** → Collect requirements step-by-step
3. **Live Validation** → Test credentials, check compatibility
4. **Preview Generation** → Show visual workflow
5. **User Confirmation** → Review and approve
6. **Backend Compilation** → Generate n8n workflow
7. **Deployment** → Activate bot
8. **Success State** → Show test instructions

---

## UI/UX Design Principles

### Core Principles

#### 1. **Progressive Disclosure**
Don't overwhelm users with all options upfront. Reveal complexity gradually.

**Example:**
```
Step 1: Basic Settings
  ├─ Bot name
  ├─ Business type
  └─ Primary goal

Step 2: Trigger Configuration (based on goal)
  ├─ Keyword (if simple)
  ├─ Webhook (if advanced)
  └─ Schedule (if batch)

Step 3: Integration Setup (only if needed)
  ├─ Shopify (if e-commerce)
  ├─ Calendar (if booking)
  └─ Payment (if transactional)
```

#### 2. **Template-First Approach**
Never start from blank canvas. Always begin with a template.

**Flow:**
```
[Choose Template] → [Customize] → [Deploy]
         ↓
  "Start from scratch?"
         ↓
  [Conversational Builder]
```

#### 3. **Contextual Help**
Provide help exactly when and where it's needed.

**Features:**
- Inline tooltips with examples
- "Why do we need this?" explanations
- Links to documentation
- Video tutorials (future)

#### 4. **Validation First**
Test everything before allowing proceed.

**Validation Types:**
- **Instant**: Field-level validation (email format, required fields)
- **Live**: API credential testing with spinner
- **Pre-deployment**: Full Blueprint validation
- **Post-deployment**: Workflow compilation check

#### 5. **Visual Feedback**
Users should always know what's happening.

**States:**
- Loading spinners with descriptive text
- Success/error toasts with actions
- Progress bars for multi-step processes
- Status badges (Connected ✓, Failed ✗, Testing...)

---

## Component Library

### Core Components

#### 1. **WizardContainer**
Main layout component for multi-step forms.

**Location:** `app/components/wizard/WizardContainer.tsx`

```tsx
'use client';

import { useState } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  component: React.ComponentType<any>;
  validate?: () => Promise<boolean>;
}

interface WizardContainerProps {
  steps: WizardStep[];
  onComplete: (data: any) => void;
  onCancel?: () => void;
}

export function WizardContainer({
  steps,
  onComplete,
  onCancel
}: WizardContainerProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Record<string, any>>({});
  const [isValidating, setIsValidating] = useState(false);

  const handleNext = async () => {
    const step = steps[currentStep];

    if (step.validate) {
      setIsValidating(true);
      const isValid = await step.validate();
      setIsValidating(false);

      if (!isValid) return;
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(wizardData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateData = (stepData: any) => {
    setWizardData(prev => ({
      ...prev,
      [steps[currentStep].id]: stepData
    }));
  };

  const CurrentStepComponent = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(progress)}% complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => index < currentStep && setCurrentStep(index)}
            disabled={index > currentStep}
            className={`
              px-4 py-2 rounded-lg text-sm whitespace-nowrap
              ${index === currentStep
                ? 'bg-blue-600 text-white'
                : index < currentStep
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
            `}
          >
            {index < currentStep && '✓ '}
            {step.title}
          </button>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        <h2 className="text-2xl font-bold mb-2">
          {steps[currentStep].title}
        </h2>
        {steps[currentStep].description && (
          <p className="text-gray-600 mb-6">
            {steps[currentStep].description}
          </p>
        )}

        <CurrentStepComponent
          data={wizardData[steps[currentStep].id] || {}}
          updateData={updateData}
          allData={wizardData}
        />
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              disabled={isValidating}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          )}
        </div>

        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isValidating}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isValidating}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isValidating ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </>
            ) : (
              <>
                {currentStep < steps.length - 1 ? 'Continue' : 'Create Bot'}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### 2. **TemplateSelector**
Choose starting point from templates.

**Location:** `app/components/wizard/TemplateSelector.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { BotTemplate } from '@/types/template';

interface TemplateSelectorProps {
  data: { selectedTemplate?: string };
  updateData: (data: any) => void;
}

export function TemplateSelector({ data, updateData }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<BotTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'popular' | 'recent'>('all');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      setTemplates(result.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (templateId: string) => {
    updateData({ selectedTemplate: templateId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All Templates
        </button>
        <button
          onClick={() => setFilter('popular')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'popular'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Popular
        </button>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className={`
              p-6 rounded-lg border-2 text-left transition-all
              ${data.selectedTemplate === template.id
                ? 'border-blue-600 bg-blue-50 shadow-lg'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
              }
            `}
          >
            <div className="text-4xl mb-3">{template.icon}</div>
            <h3 className="font-bold text-lg mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-4">{template.tagline}</p>

            {/* Required Integrations */}
            {template.required_integrations && template.required_integrations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {template.required_integrations.map(integration => (
                  <span
                    key={integration}
                    className="text-xs px-2 py-1 bg-gray-100 rounded-full"
                  >
                    {integration}
                  </span>
                ))}
              </div>
            )}

            {data.selectedTemplate === template.id && (
              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Custom Bot Option */}
      <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
        <button
          onClick={() => handleSelect('custom')}
          className="w-full text-left"
        >
          <h3 className="font-bold text-lg mb-2">🛠️ Start from Scratch</h3>
          <p className="text-sm text-gray-600">
            Use our conversational builder to create a fully custom bot
          </p>
        </button>
      </div>
    </div>
  );
}
```

#### 3. **IntegrationConnector**
Connect and test external service credentials.

**Location:** `app/components/wizard/IntegrationConnector.tsx`

```tsx
'use client';

import { useState } from 'react';

interface Integration {
  service: string;
  name: string;
  icon: string;
  required: boolean;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'password' | 'url';
    placeholder: string;
    help?: string;
  }>;
}

interface IntegrationConnectorProps {
  integrations: Integration[];
  data: Record<string, any>;
  updateData: (data: any) => void;
}

export function IntegrationConnector({
  integrations,
  data,
  updateData
}: IntegrationConnectorProps) {
  const [testingService, setTestingService] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({});

  const handleFieldChange = (service: string, field: string, value: string) => {
    updateData({
      ...data,
      [service]: {
        ...data[service],
        [field]: value
      }
    });
  };

  const testConnection = async (service: string) => {
    setTestingService(service);

    try {
      const response = await fetch(`/api/integrations/${service}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data[service])
      });

      const result = await response.json();

      setTestResults(prev => ({
        ...prev,
        [service]: result.success ? 'success' : 'error'
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: 'error'
      }));
    } finally {
      setTestingService(null);
    }
  };

  return (
    <div className="space-y-6">
      {integrations.map(integration => (
        <div
          key={integration.service}
          className="border rounded-lg p-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{integration.icon}</span>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {integration.name}
                  {integration.required && (
                    <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                      Required
                    </span>
                  )}
                </h3>
                {testResults[integration.service] === 'success' && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Connected successfully
                  </p>
                )}
              </div>
            </div>

            {testResults[integration.service] === 'success' && (
              <span className="text-green-600">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {integration.fields.map(field => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={data[integration.service]?.[field.name] || ''}
                  onChange={e => handleFieldChange(integration.service, field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {field.help && (
                  <p className="text-sm text-gray-500 mt-1">{field.help}</p>
                )}
              </div>
            ))}
          </div>

          {/* Test Button */}
          <button
            onClick={() => testConnection(integration.service)}
            disabled={testingService === integration.service}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {testingService === integration.service ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testing Connection...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Test Connection
              </>
            )}
          </button>

          {/* Error Message */}
          {testResults[integration.service] === 'error' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Failed to connect. Please check your credentials and try again.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### 4. **BlueprintPreview**
Visual workflow diagram (read-only).

**Location:** `app/components/wizard/BlueprintPreview.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

interface BlueprintPreviewProps {
  blueprint: {
    nodes: Array<{
      id: string;
      type: string;
      name?: string;
      config: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
}

export function BlueprintPreview({ blueprint }: BlueprintPreviewProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    // Convert Blueprint nodes to ReactFlow nodes
    const flowNodes: Node[] = blueprint.nodes.map((node, index) => ({
      id: node.id,
      type: 'default',
      position: { x: 250, y: index * 150 }, // Simple vertical layout
      data: {
        label: (
          <div className="p-2">
            <div className="font-bold text-sm">{getNodeIcon(node.type)} {node.name || node.type}</div>
            <div className="text-xs text-gray-500 mt-1">{getNodeDescription(node)}</div>
          </div>
        )
      },
      style: {
        background: getNodeColor(node.type),
        border: '2px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px',
        width: 250
      }
    }));

    const flowEdges: Edge[] = blueprint.edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: { stroke: '#6B7280', strokeWidth: 2 }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [blueprint]);

  const getNodeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      whatsapp_trigger: '📱',
      whatsapp_reply: '💬',
      ask_question: '❓',
      if_condition: '🔀',
      shopify_lookup: '🛍️',
      knowledge_search: '🧠',
      http_request: '🌐',
      database_query: '🗄️',
      paystack_payment: '💳',
      delay: '⏰',
      loop: '🔁'
    };
    return icons[type] || '⚙️';
  };

  const getNodeColor = (type: string): string => {
    const colors: Record<string, string> = {
      whatsapp_trigger: '#DBEAFE',
      whatsapp_reply: '#DBEAFE',
      ask_question: '#FEF3C7',
      if_condition: '#FCE7F3',
      shopify_lookup: '#D1FAE5',
      knowledge_search: '#E0E7FF',
      http_request: '#FED7AA',
      database_query: '#DDD6FE',
      paystack_payment: '#BBF7D0',
      delay: '#E5E7EB',
      loop: '#FED7AA'
    };
    return colors[type] || '#F3F4F6';
  };

  const getNodeDescription = (node: any): string => {
    if (node.type === 'whatsapp_trigger' && node.config.keyword) {
      return `Trigger: "${node.config.keyword}"`;
    }
    if (node.type === 'ask_question' && node.config.question) {
      return node.config.question.substring(0, 30) + '...';
    }
    if (node.type === 'if_condition' && node.config.condition) {
      return `If ${node.config.condition}`;
    }
    return node.type.replace(/_/g, ' ');
  };

  return (
    <div className="w-full h-[600px] border rounded-lg overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

---

## Template-Based Workflow

### Starting from Templates

Users always begin with a template (even for "custom" bots):

**Flow:**
```
1. Choose Template
   ├─ E-commerce Order Bot
   ├─ Booking Assistant
   ├─ FAQ Bot
   └─ Custom (Blank)

2. Customize Basic Info
   ├─ Bot Name
   ├─ Welcome Message
   └─ Fallback Behavior

3. Configure Integrations
   ├─ Required (e.g., Shopify for e-commerce)
   └─ Optional (e.g., Analytics, CRM)

4. Advanced Settings (Optional)
   ├─ Custom Triggers
   ├─ Workflow Modifications
   └─ AI Personality

5. Preview & Deploy
   ├─ Visual Workflow
   ├─ Test Mode
   └─ Deploy to Production
```

### Template Customization UI

**Location:** `app/components/wizard/TemplateCustomizer.tsx`

See the full implementation in the Component Library section above.

---

## Wizard Flow

### Complete Wizard Implementation

**Location:** `app/dashboard/bots/create/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardContainer } from '@/app/components/wizard/WizardContainer';
import { TemplateSelector } from '@/app/components/wizard/TemplateSelector';
import { TemplateCustomizer } from '@/app/components/wizard/TemplateCustomizer';
import { IntegrationConnector } from '@/app/components/wizard/IntegrationConnector';
import { BlueprintPreview } from '@/app/components/wizard/BlueprintPreview';

export default function CreateBotPage() {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<any>(null);

  const steps = [
    {
      id: 'template',
      title: 'Choose Template',
      description: 'Start with a pre-built template or create from scratch',
      component: TemplateSelector
    },
    {
      id: 'customize',
      title: 'Customize Bot',
      description: 'Configure your bot\'s behavior and responses',
      component: (props: any) => (
        <TemplateCustomizer
          templateId={props.allData.template?.selectedTemplate}
          {...props}
        />
      ),
      validate: async () => {
        // Validate required fields
        return true;
      }
    },
    {
      id: 'integrations',
      title: 'Connect Services',
      description: 'Connect external services your bot needs',
      component: (props: any) => {
        // Get required integrations from template
        const integrations = [
          {
            service: 'shopify',
            name: 'Shopify',
            icon: '🛍️',
            required: true,
            fields: [
              {
                name: 'api_key',
                label: 'API Key',
                type: 'password' as const,
                placeholder: 'shpat_...',
                help: 'Found in Shopify Admin → Apps → Private Apps'
              },
              {
                name: 'store_url',
                label: 'Store URL',
                type: 'url' as const,
                placeholder: 'yourstore.myshopify.com'
              }
            ]
          }
        ];

        return <IntegrationConnector integrations={integrations} {...props} />;
      },
      validate: async () => {
        // Validate all required integrations are connected
        return true;
      }
    },
    {
      id: 'preview',
      title: 'Preview & Deploy',
      description: 'Review your bot workflow before deployment',
      component: (props: any) => {
        // Generate blueprint from wizard data
        if (!blueprint) {
          generateBlueprint(props.allData).then(setBlueprint);
        }

        return blueprint ? (
          <div>
            <BlueprintPreview blueprint={blueprint} />
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This is a preview of your bot workflow.
                Click "Create Bot" to deploy it to production.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        );
      }
    }
  ];

  const handleComplete = async (wizardData: any) => {
    try {
      // Generate final blueprint
      const finalBlueprint = await generateBlueprint(wizardData);

      // Compile to n8n workflow
      const response = await fetch('/api/workflows/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint: finalBlueprint })
      });

      const result = await response.json();

      if (result.success) {
        // Create bot record
        const botResponse = await fetch('/api/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: wizardData.customize.bot_name,
            workflow_id: result.workflow.id,
            config: wizardData
          })
        });

        const botResult = await botResponse.json();

        if (botResult.success) {
          router.push(`/dashboard/bots/${botResult.bot.id}?success=true`);
        }
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
      alert('Failed to create bot. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/bots');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Create New Bot</h1>
        <p className="text-gray-600 mb-8">
          Follow the steps below to create your custom WhatsApp bot
        </p>

        <WizardContainer
          steps={steps}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

async function generateBlueprint(wizardData: any) {
  // Call Bot Builder API to generate blueprint
  const response = await fetch(`/api/bots/temp/builder/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      template: wizardData.template?.selectedTemplate,
      customization: wizardData.customize,
      integrations: wizardData.integrations
    })
  });

  const result = await response.json();
  return result.blueprint;
}
```

---

## Credential Management

### Secure Credential Storage

See the backend implementation in [PHASE2_WEEK4_GUIDE.md](./PHASE2_WEEK4_GUIDE.md) - includes:
- AES-256-GCM encryption
- Test connections before saving
- Scoped access per organization
- Encrypted storage in database

---

## Validation Layer

### Frontend Validation

**Location:** `app/lib/validation.ts`

```typescript
import { z } from 'zod';

export const BotNameSchema = z.string()
  .min(3, 'Bot name must be at least 3 characters')
  .max(50, 'Bot name must be less than 50 characters')
  .regex(/^[a-zA-Z0-9\s-]+$/, 'Bot name can only contain letters, numbers, spaces, and hyphens');

export const ShopifyCredentialsSchema = z.object({
  api_key: z.string()
    .min(1, 'API Key is required')
    .regex(/^shpat_/, 'Invalid Shopify API key format'),
  store_url: z.string()
    .min(1, 'Store URL is required')
    .regex(/^[a-z0-9-]+\.myshopify\.com$/, 'Invalid Shopify store URL format')
});
```

---

## State Management

### Zustand Store for Wizard State

**Location:** `app/store/wizardStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WizardState {
  wizardData: Record<string, any>;
  currentStep: number;
  blueprint: any | null;
  validationErrors: Record<string, string[]>;

  updateStepData: (step: string, data: any) => void;
  setCurrentStep: (step: number) => void;
  setBlueprint: (blueprint: any) => void;
  resetWizard: () => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      wizardData: {},
      currentStep: 0,
      blueprint: null,
      validationErrors: {},

      updateStepData: (step, data) =>
        set((state) => ({
          wizardData: { ...state.wizardData, [step]: data }
        })),

      setCurrentStep: (step) => set({ currentStep: step }),
      setBlueprint: (blueprint) => set({ blueprint }),
      resetWizard: () => set({
        wizardData: {},
        currentStep: 0,
        blueprint: null,
        validationErrors: {}
      })
    }),
    { name: 'botflow-wizard-storage' }
  )
);
```

---

## Day-by-Day Plan

### Day 1: Core Components
- [ ] Create WizardContainer component
- [ ] Create wizard state management
- [ ] Test navigation flow
- [ ] Create TemplateSelector component

### Day 2: Template Customization
- [ ] Create TemplateCustomizer component
- [ ] Implement dynamic field rendering
- [ ] Add field validation
- [ ] Test with all template types

### Day 3: Integration Management
- [ ] Create IntegrationConnector component
- [ ] Implement credential testing API
- [ ] Add encryption for credentials
- [ ] Test with real API credentials

### Day 4: Blueprint Preview
- [ ] Install ReactFlow
- [ ] Create BlueprintPreview component
- [ ] Implement node rendering
- [ ] Add minimap and controls

### Day 5: Wizard Flow Integration
- [ ] Create main wizard page
- [ ] Wire up all steps
- [ ] Implement validation
- [ ] Test complete flow

### Day 6: Polish & Optimization
- [ ] Implement loading states
- [ ] Add accessibility features
- [ ] Mobile responsiveness
- [ ] Cross-browser testing

### Day 7: Testing & Documentation
- [ ] Write component tests
- [ ] Integration testing
- [ ] Create user documentation
- [ ] Create PHASE2_WEEK4_COMPLETE.md

---

## Success Criteria

### Functional Requirements
- [ ] Users can select from 13+ templates
- [ ] Users can customize bot without code
- [ ] Credentials are tested before saving
- [ ] Preview shows accurate workflow
- [ ] Bot deploys successfully

### Non-Functional Requirements
- [ ] Wizard loads in <2 seconds
- [ ] Works on mobile
- [ ] Accessible (WCAG 2.1 AA)
- [ ] No data loss on refresh

### User Experience
- [ ] Intuitive navigation
- [ ] Clear error messages
- [ ] Visual feedback
- [ ] Feels "magical"

---

## Quick Start (For New Chat)

```
I'm ready to start Phase 2 Week 4: The Visual Builder.

Context:
- Week 1 (RAG) ✅
- Week 2 (Workflow Engine) ✅
- Week 3 (Intelligent Bot Builder) ✅

Goal: Create beautiful wizard interface for bot configuration.

Read PHASE2_WEEK4_GUIDE.md and let's start with Day 1: Core Components!
```

---

**Created:** 2026-01-16
**Status:** Ready to implement ⏳
**Prerequisites:** ✅ Week 1-3
**Estimated Completion:** 5-7 days

---

> "From workflows to intelligence to interface. Let's make bot building delightful!" 🧙‍♂️✨
