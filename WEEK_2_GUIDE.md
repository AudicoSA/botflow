# Week 2 Implementation Guide
## Template Onboarding Flow (Frontend)

**Week:** 2 of 13
**Phase:** 1 - Template Infrastructure
**Duration:** 5-7 days
**Focus:** User-facing template selection and bot setup

---

## Week Overview

This week we're building the **frontend onboarding experience** that lets users discover templates, configure them, and create working bots. Think of this as the "app store" for bot templates plus the setup wizard.

### What You'll Build
1. Template marketplace/selection screen with filtering
2. Template preview modal with full details
3. Dynamic form generator (reads `required_fields` from template JSON)
4. Multi-step onboarding wizard (3 steps: name → configure → review)
5. Complete integration with backend template API from Week 1

### Success Criteria
By end of week, you should be able to:
- ✅ Browse all available templates in a visual grid
- ✅ Filter templates by tier (Popular, Business, Professional)
- ✅ Preview template details before selecting
- ✅ Fill out dynamically generated configuration form
- ✅ Create a bot from a template end-to-end
- ✅ See success confirmation with bot details

---

## Quick Links

**Schedule:** [WEEK_SCHEDULE.md](./WEEK_SCHEDULE.md)
**Build Plan:** [BUILD_PLAN_2025.md](./BUILD_PLAN_2025.md)
**Previous Week:** [WEEK_1_GUIDE.md](./WEEK_1_GUIDE.md) ✅ Complete
**Next Week:** `WEEK_3_GUIDE.md` (create when ready)

---

## Context from Week 1

### What Was Built Last Week
Week 1 focused on backend template infrastructure:

1. **Database:** `bot_templates` table with RLS policies
2. **API Endpoints:**
   - `GET /api/templates` - List all published templates
   - `GET /api/templates/:id` - Get specific template
   - `GET /api/templates/vertical/:vertical` - Filter by vertical
   - `POST /api/bots/create-from-template` - Create bot from template
3. **Template Structure:**
   - `required_fields` - Dynamic form field definitions
   - `conversation_flow` - AI instructions with `{{variable}}` placeholders
   - Template validation and instantiation services
4. **Seeded Template:** Taxi & Shuttle Service template (ID: 248320a2-8750-460a-9068-735fd27eadfc)

### Backend API Available
You have these working endpoints to call from the frontend:

```bash
# Get all templates (no auth required)
GET http://localhost:3001/api/templates

# Response:
{
  "templates": [
    {
      "id": "uuid",
      "name": "Taxi & Shuttle Service",
      "vertical": "taxi",
      "tier": 1,
      "description": "...",
      "tagline": "Book rides in seconds",
      "icon": "🚕",
      "required_fields": { ... },
      "conversation_flow": { ... },
      "example_prompts": [...],
      "integrations": ["maps", "calendar"],
      "is_published": true
    }
  ]
}

# Get specific template (no auth required)
GET http://localhost:3001/api/templates/:id

# Create bot from template (auth required)
POST http://localhost:3001/api/bots/create-from-template
Headers: Authorization: Bearer <token>
Body:
{
  "template_id": "uuid",
  "organization_id": "uuid",
  "whatsapp_account_id": "uuid",
  "bot_name": "My Bot",
  "field_values": {
    "business_name": "Test Business",
    "service_area": "Cape Town",
    ...
  }
}
```

### Template Field Types
Templates can have 7 field types that your dynamic form must support:
- `text` - Single line text input
- `textarea` - Multi-line text input
- `number` - Numeric input with min/max
- `select` - Dropdown with predefined options
- `multiselect` - Multiple checkbox selection
- `time` - Time picker (not implemented yet, use text)
- `json` - JSON input (not implemented yet, use textarea)

---

## Prerequisites

Before starting Week 2, ensure:

### Required
- ✅ Week 1 complete (backend template API working)
- ✅ Backend server running on `http://localhost:3001`
- ✅ At least 1 template seeded (verify with: `curl http://localhost:3001/api/templates`)
- ✅ Frontend project exists at `botflow-website/`
- ✅ Node.js 18+ installed
- ✅ Next.js 15 working (`cd botflow-website && npm run dev`)

### Verify Backend
Run these commands to verify Week 1 is complete:

```bash
# 1. Check server health
curl http://localhost:3001/health

# 2. Check templates exist
curl http://localhost:3001/api/templates

# 3. Verify template structure
curl http://localhost:3001/api/templates/248320a2-8750-460a-9068-735fd27eadfc
```

### Frontend Setup
Your frontend should have this structure:
```
botflow-website/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx           # Dashboard home
│   │   ├── bots/
│   │   │   └── page.tsx       # Bot list
│   │   └── layout.tsx         # Dashboard layout
│   ├── components/            # Shared components
│   ├── login/                 # Auth pages
│   └── page.tsx               # Landing page
├── package.json
└── next.config.js
```

---

## Day-by-Day Breakdown

### Day 1: Template Selection Screen

**Goal:** Build the template marketplace UI where users browse templates

#### Step 1.1: Create Templates Page

Create file: `botflow-website/app/dashboard/templates/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { TemplateCard } from '@/app/components/TemplateCard';
import { TemplatePreviewModal } from '@/app/components/TemplatePreviewModal';

interface Template {
  id: string;
  name: string;
  vertical: string;
  tier: number;
  description: string;
  tagline: string;
  icon: string;
  is_published: boolean;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [filterTier, setFilterTier] = useState<number | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`);

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data.templates);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setError('Unable to load templates. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = filterTier
    ? templates.filter(t => t.tier === filterTier)
    : templates;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-semibold mb-2">⚠️ Error Loading Templates</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchTemplates}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Bot Template</h1>
        <p className="text-gray-600">
          Select a template designed for your industry and get your bot running in minutes.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-4 mb-6 overflow-x-auto">
        <button
          onClick={() => setFilterTier(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            !filterTier
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          All Templates ({templates.length})
        </button>
        <button
          onClick={() => setFilterTier(1)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 1
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          🔥 Popular ({templates.filter(t => t.tier === 1).length})
        </button>
        <button
          onClick={() => setFilterTier(2)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 2
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          💼 Business ({templates.filter(t => t.tier === 2).length})
        </button>
        <button
          onClick={() => setFilterTier(3)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
            filterTier === 3
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          🎯 Professional ({templates.filter(t => t.tier === 3).length})
        </button>
      </div>

      {/* Template Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No templates found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={() => setSelectedTemplate(template)}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSelect={(templateId) => {
            window.location.href = `/dashboard/templates/${templateId}/setup`;
          }}
        />
      )}
    </div>
  );
}
```

#### Step 1.2: Create Template Card Component

Create file: `botflow-website/app/components/TemplateCard.tsx`

```typescript
'use client';

interface Template {
  id: string;
  name: string;
  vertical: string;
  description: string;
  tagline: string;
  icon: string;
  tier: number;
}

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const tierLabels = {
    1: { label: 'Popular', color: 'bg-blue-100 text-blue-800' },
    2: { label: 'Business', color: 'bg-purple-100 text-purple-800' },
    3: { label: 'Professional', color: 'bg-green-100 text-green-800' },
  };

  const tierInfo = tierLabels[template.tier as keyof typeof tierLabels];

  return (
    <div
      onClick={onClick}
      className="border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer bg-white group"
    >
      {/* Icon and Badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="text-4xl">{template.icon}</div>
        {tierInfo && (
          <span className={`${tierInfo.color} text-xs px-2 py-1 rounded font-medium`}>
            {tierInfo.label}
          </span>
        )}
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition">
        {template.name}
      </h3>
      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
        {template.tagline}
      </p>

      {/* Action Button */}
      <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium">
        View Details →
      </button>
    </div>
  );
}
```

#### Step 1.3: Add Navigation Link

Update your dashboard navigation to include templates:

In `botflow-website/app/dashboard/layout.tsx`:

```typescript
// Add to navigation array
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Bots', href: '/dashboard/bots', icon: '🤖' },
  { name: 'Templates', href: '/dashboard/templates', icon: '📋' }, // ADD THIS
  { name: 'Conversations', href: '/dashboard/conversations', icon: '💬' },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📈' },
];
```

#### Step 1.4: Configure Environment Variable

Create/update: `botflow-website/.env.local`

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### Validation Checklist for Day 1

Run your frontend:
```bash
cd botflow-website
npm run dev
```

Navigate to `http://localhost:3000/dashboard/templates`

Verify:
- [ ] Page loads without errors
- [ ] Templates display in grid layout
- [ ] Filter buttons work
- [ ] Template count shows correctly
- [ ] Cards are clickable
- [ ] Loading skeleton appears initially
- [ ] Error state works (test by stopping backend)

---

### Day 2: Template Preview Modal

**Goal:** Show full template details in a modal before user selects it

#### Step 2.1: Create Preview Modal Component

Create file: `botflow-website/app/components/TemplatePreviewModal.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';

interface Template {
  id: string;
  name: string;
  vertical: string;
  description: string;
  tagline: string;
  icon: string;
  example_prompts: string[];
  integrations: string[];
  required_fields: Record<string, any>;
}

interface TemplatePreviewModalProps {
  template: Template;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

export function TemplatePreviewModal({
  template,
  onClose,
  onSelect
}: TemplatePreviewModalProps) {
  const [fullTemplate, setFullTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFullTemplate();
  }, [template.id]);

  const fetchFullTemplate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/templates/${template.id}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch template details');
      }

      const data = await response.json();
      setFullTemplate(data.template);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      setError('Unable to load template details');
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-24 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800">{error}</p>
              <button
                onClick={onClose}
                className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-5xl">{fullTemplate.icon}</div>
                  <div>
                    <h2 className="text-2xl font-bold">{fullTemplate.name}</h2>
                    <p className="text-gray-600">{fullTemplate.tagline}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-3xl leading-none"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2">About This Template</h3>
                <p className="text-gray-700">{fullTemplate.description}</p>
              </div>

              {/* Example Prompts */}
              {fullTemplate.example_prompts && fullTemplate.example_prompts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">
                    📱 Example Customer Messages
                  </h3>
                  <div className="space-y-2">
                    {fullTemplate.example_prompts.map((prompt: string, index: number) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg"
                      >
                        <span className="text-blue-600 text-xl">💬</span>
                        <span className="text-gray-700 text-sm flex-1">"{prompt}"</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Fields */}
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  📝 What You'll Need to Setup
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  We'll ask for these details during setup:
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="space-y-2">
                    {Object.entries(fullTemplate.required_fields || {}).map(
                      ([key, field]: [string, any]) => (
                        <li key={key} className="flex items-start gap-2">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <div className="flex-1">
                            <span className="text-gray-900 font-medium">
                              {field.label}
                              {field.required && (
                                <span className="text-red-500 ml-1">*</span>
                              )}
                            </span>
                            {field.helpText && (
                              <p className="text-gray-600 text-xs mt-0.5">
                                {field.helpText}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>

              {/* Integrations */}
              {fullTemplate.integrations && fullTemplate.integrations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">🔌 Integrations</h3>
                  <div className="flex gap-2 flex-wrap">
                    {fullTemplate.integrations.map((integration: string) => (
                      <span
                        key={integration}
                        className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {integration}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup Time Estimate */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="font-semibold text-green-900">
                      Setup time: ~5 minutes
                    </p>
                    <p className="text-green-700 text-sm">
                      Answer a few questions and your bot will be ready to go!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t sticky bottom-0 bg-white flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => onSelect(fullTemplate.id)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium shadow-sm"
              >
                Use This Template →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

#### Validation Checklist for Day 2

Test the modal:
- [ ] Modal opens when clicking template card
- [ ] Modal shows loading state initially
- [ ] Full template details load and display
- [ ] Example prompts show correctly
- [ ] Required fields list all fields from template
- [ ] Integrations display as badges
- [ ] Close button (×) works
- [ ] Clicking outside modal closes it
- [ ] Escape key closes modal
- [ ] "Use This Template" navigates to setup page
- [ ] Modal is scrollable if content is long

---

### Day 3: Dynamic Form Generator

**Goal:** Build a component that generates forms automatically from template `required_fields`

#### Step 3.1: Create Dynamic Form Component

Create file: `botflow-website/app/components/DynamicForm.tsx`

```typescript
'use client';

import { useState } from 'react';

/**
 * Field definition from template JSON
 */
interface FieldDefinition {
  type: 'text' | 'textarea' | 'number' | 'select' | 'multiselect' | 'time' | 'json';
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  helpText?: string;
  defaultValue?: any;
}

interface DynamicFormProps {
  fields: Record<string, FieldDefinition>;
  values: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors: Record<string, string>;
}

export function DynamicForm({ fields, values, onChange, errors }: DynamicFormProps) {
  return (
    <div className="space-y-6">
      {Object.entries(fields).map(([fieldName, fieldDef]) => (
        <div key={fieldName} className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {fieldDef.label}
            {fieldDef.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {renderField(fieldName, fieldDef, values[fieldName], onChange, errors[fieldName])}

          {fieldDef.helpText && (
            <p className="text-sm text-gray-500">{fieldDef.helpText}</p>
          )}

          {errors[fieldName] && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <span>⚠️</span>
              {errors[fieldName]}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Render appropriate input based on field type
 */
function renderField(
  fieldName: string,
  fieldDef: FieldDefinition,
  value: any,
  onChange: (fieldName: string, value: any) => void,
  error?: string
) {
  const baseInputClasses = `w-full border rounded-lg px-4 py-2 transition ${
    error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  } focus:outline-none focus:ring-2`;

  switch (fieldDef.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder}
          className={baseInputClasses}
        />
      );

    case 'textarea':
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder}
          rows={4}
          className={baseInputClasses}
        />
      );

    case 'number':
      return (
        <div className="relative">
          <input
            type="number"
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
              onChange(fieldName, val);
            }}
            placeholder={fieldDef.placeholder}
            min={fieldDef.validation?.min}
            max={fieldDef.validation?.max}
            className={baseInputClasses}
          />
          {(fieldDef.validation?.min !== undefined || fieldDef.validation?.max !== undefined) && (
            <p className="text-xs text-gray-500 mt-1">
              {fieldDef.validation.min !== undefined && `Min: ${fieldDef.validation.min}`}
              {fieldDef.validation.min !== undefined && fieldDef.validation.max !== undefined && ' • '}
              {fieldDef.validation.max !== undefined && `Max: ${fieldDef.validation.max}`}
            </p>
          )}
        </div>
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          className={baseInputClasses}
        >
          <option value="">-- Select an option --</option>
          {fieldDef.validation?.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <div className="border border-gray-300 rounded-lg p-4 space-y-2 bg-gray-50">
          {fieldDef.validation?.options?.map((option) => {
            const isChecked = Array.isArray(value) && value.includes(option);

            return (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    const currentValue = Array.isArray(value) ? value : [];
                    const newValue = e.target.checked
                      ? [...currentValue, option]
                      : currentValue.filter((v) => v !== option);
                    onChange(fieldName, newValue);
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            );
          })}
          {(!fieldDef.validation?.options || fieldDef.validation.options.length === 0) && (
            <p className="text-sm text-gray-500">No options available</p>
          )}
        </div>
      );

    case 'time':
      // Time picker - for now use text input
      // TODO: Implement proper time picker in future
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder || 'e.g., 9:00 AM - 5:00 PM'}
          className={baseInputClasses}
        />
      );

    case 'json':
      // JSON input - use textarea with validation
      // TODO: Add JSON syntax highlighting in future
      return (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(fieldName, e.target.value)}
          placeholder={fieldDef.placeholder || 'Enter valid JSON'}
          rows={6}
          className={`${baseInputClasses} font-mono text-sm`}
        />
      );

    default:
      return (
        <div className="text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded p-3">
          Unsupported field type: {fieldDef.type}
        </div>
      );
  }
}
```

#### Step 3.2: Create Validation Helper

Create file: `botflow-website/app/utils/formValidation.ts`

```typescript
interface FieldDefinition {
  type: string;
  label: string;
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
}

/**
 * Validate field values against template field definitions
 */
export function validateFieldValues(
  fields: Record<string, FieldDefinition>,
  values: Record<string, any>
): Record<string, string> {
  const errors: Record<string, string> = {};

  Object.entries(fields).forEach(([fieldName, fieldDef]) => {
    const value = values[fieldName];

    // Check required fields
    if (fieldDef.required) {
      if (value === undefined || value === null || value === '') {
        errors[fieldName] = `${fieldDef.label} is required`;
        return;
      }

      // For multiselect, check if array is empty
      if (fieldDef.type === 'multiselect' && Array.isArray(value) && value.length === 0) {
        errors[fieldName] = `Please select at least one ${fieldDef.label.toLowerCase()}`;
        return;
      }
    }

    // Skip validation if field is empty and not required
    if (value === undefined || value === null || value === '') {
      return;
    }

    // Type-specific validation
    if (fieldDef.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors[fieldName] = `${fieldDef.label} must be a valid number`;
        return;
      }

      if (fieldDef.validation) {
        if (fieldDef.validation.min !== undefined && value < fieldDef.validation.min) {
          errors[fieldName] = `${fieldDef.label} must be at least ${fieldDef.validation.min}`;
          return;
        }
        if (fieldDef.validation.max !== undefined && value > fieldDef.validation.max) {
          errors[fieldName] = `${fieldDef.label} must be at most ${fieldDef.validation.max}`;
          return;
        }
      }
    }

    // Select validation
    if (fieldDef.type === 'select' && fieldDef.validation?.options) {
      if (!fieldDef.validation.options.includes(value)) {
        errors[fieldName] = `Invalid selection for ${fieldDef.label}`;
        return;
      }
    }

    // Multiselect validation
    if (fieldDef.type === 'multiselect' && fieldDef.validation?.options) {
      if (!Array.isArray(value)) {
        errors[fieldName] = `${fieldDef.label} must be an array`;
        return;
      }

      const invalidOptions = value.filter(v => !fieldDef.validation?.options?.includes(v));
      if (invalidOptions.length > 0) {
        errors[fieldName] = `Invalid selections: ${invalidOptions.join(', ')}`;
        return;
      }
    }

    // Pattern validation (for text fields)
    if (fieldDef.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(fieldDef.validation.pattern);
      if (!regex.test(value)) {
        errors[fieldName] = `${fieldDef.label} format is invalid`;
        return;
      }
    }
  });

  return errors;
}
```

#### Validation Checklist for Day 3

Create a test page to verify all field types render correctly:

Test:
- [ ] Text input renders and captures value
- [ ] Textarea renders with multiple lines
- [ ] Number input only accepts numbers
- [ ] Number input respects min/max
- [ ] Select dropdown shows all options
- [ ] Multiselect shows checkboxes
- [ ] Multiselect allows multiple selections
- [ ] Required field indicator (*) shows
- [ ] Help text displays below field
- [ ] Error messages display in red
- [ ] Validation function catches missing required fields
- [ ] Validation function checks data types
- [ ] Validation function validates select options

---

### Day 4: Multi-Step Setup Wizard

**Goal:** Guide users through bot creation in 3 steps

#### Step 4.1: Create Setup Wizard Page

Create file: `botflow-website/app/dashboard/templates/[templateId]/setup/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DynamicForm } from '@/app/components/DynamicForm';
import { validateFieldValues } from '@/app/utils/formValidation';

export default function TemplateSetupPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.templateId as string;

  // State
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [botName, setBotName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/templates/${templateId}`
      );

      if (!response.ok) {
        throw new Error('Template not found');
      }

      const data = await response.json();
      setTemplate(data.template);
    } catch (error) {
      console.error('Failed to fetch template:', error);
      alert('Failed to load template. Redirecting...');
      router.push('/dashboard/templates');
    } finally {
      setLoading(false);
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate bot name
      if (!botName.trim()) {
        newErrors.botName = 'Bot name is required';
      } else if (botName.trim().length < 3) {
        newErrors.botName = 'Bot name must be at least 3 characters';
      } else if (botName.trim().length > 50) {
        newErrors.botName = 'Bot name must be less than 50 characters';
      }
    }

    if (step === 2) {
      // Validate field values using our validation helper
      const fieldErrors = validateFieldValues(template.required_fields, fieldValues);
      Object.assign(newErrors, fieldErrors);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setErrors({});
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleCreateBot = async () => {
    if (!validateStep()) return;

    setCreating(true);
    setErrors({});

    try {
      // Get auth token from localStorage
      // NOTE: Adjust this based on your auth implementation
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Get user context (org and whatsapp account)
      // NOTE: Replace these with actual values from your user context
      const organizationId = localStorage.getItem('organizationId');
      const whatsappAccountId = localStorage.getItem('whatsappAccountId');

      if (!organizationId || !whatsappAccountId) {
        throw new Error('Missing organization or WhatsApp account. Please complete setup first.');
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/bots/create-from-template`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            template_id: templateId,
            organization_id: organizationId,
            whatsapp_account_id: whatsappAccountId,
            bot_name: botName,
            field_values: fieldValues,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create bot');
      }

      const data = await response.json();

      // Redirect to bot detail page with success message
      router.push(`/dashboard/bots/${data.bot.id}?created=true`);
    } catch (error: any) {
      console.error('Failed to create bot:', error);
      setErrors({
        submit: error.message || 'Failed to create bot. Please try again.'
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Set Up Your Bot</h1>
        <p className="text-gray-600">
          Template: <span className="font-semibold">{template.name}</span>
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {step} of {totalSteps}
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Name' },
            { num: 2, label: 'Configure' },
            { num: 3, label: 'Review' },
          ].map((s, index) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step > s.num
                      ? 'bg-green-600 text-white'
                      : step === s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className="text-xs mt-1 text-gray-600">{s.label}</span>
              </div>
              {index < 2 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    step > s.num ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Name Your Bot</h2>
            <p className="text-gray-600 text-sm mb-6">
              Choose a name that helps you identify this bot in your dashboard.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bot Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={botName}
                onChange={(e) => {
                  setBotName(e.target.value);
                  if (errors.botName) {
                    setErrors({ ...errors, botName: '' });
                  }
                }}
                placeholder="e.g., My Taxi Service Bot"
                className={`w-full border rounded-lg px-4 py-3 ${
                  errors.botName
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none focus:ring-2`}
                autoFocus
              />
              {errors.botName && (
                <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                  <span>⚠️</span>
                  {errors.botName}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {botName.length}/50 characters
              </p>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div>
                  <p className="font-semibold text-blue-900">{template.name}</p>
                  <p className="text-sm text-blue-700">{template.tagline}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Configure Your Bot</h2>
            <p className="text-gray-600 text-sm mb-6">
              Provide details about your business so your bot can assist customers effectively.
            </p>

            <DynamicForm
              fields={template.required_fields}
              values={fieldValues}
              onChange={(fieldName, value) => {
                setFieldValues({ ...fieldValues, [fieldName]: value });
                // Clear error for this field
                if (errors[fieldName]) {
                  const newErrors = { ...errors };
                  delete newErrors[fieldName];
                  setErrors(newErrors);
                }
              }}
              errors={errors}
            />
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Review & Create</h2>
            <p className="text-gray-600 text-sm mb-6">
              Please review your configuration before creating the bot.
            </p>

            <div className="space-y-6">
              {/* Bot Name */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Bot Name</h3>
                <p className="text-gray-900">{botName}</p>
              </div>

              {/* Template */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">Template</h3>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <span className="text-gray-900">{template.name}</span>
                </div>
              </div>

              {/* Configuration */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Configuration</h3>
                <div className="space-y-2">
                  {Object.entries(fieldValues).map(([key, value]) => {
                    const fieldDef = template.required_fields[key];
                    if (!fieldDef) return null;

                    return (
                      <div
                        key={key}
                        className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="text-gray-600 text-sm font-medium">
                          {fieldDef.label}:
                        </span>
                        <span className="text-gray-900 text-sm text-right max-w-xs">
                          {Array.isArray(value)
                            ? value.join(', ')
                            : value?.toString() || '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {errors.submit && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-2">
                  <span className="text-red-600">⚠️</span>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 mb-1">Error Creating Bot</p>
                    <p className="text-red-700 text-sm">{errors.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition"
        >
          ← Back
        </button>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/dashboard/templates')}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleCreateBot}
              disabled={creating}
              className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm flex items-center gap-2"
            >
              {creating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <span>✓</span>
                  Create Bot
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### Step 4.2: Handle Success State

Update or create: `botflow-website/app/dashboard/bots/[botId]/page.tsx`

```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BotDetailPage({ params }: { params: { botId: string } }) {
  const searchParams = useSearchParams();
  const justCreated = searchParams.get('created') === 'true';
  const [showSuccess, setShowSuccess] = useState(justCreated);

  useEffect(() => {
    if (justCreated) {
      // Auto-hide success message after 10 seconds
      const timer = setTimeout(() => setShowSuccess(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [justCreated]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🎉</div>
            <div className="flex-1">
              <h2 className="text-green-900 font-bold text-lg mb-1">
                Bot Created Successfully!
              </h2>
              <p className="text-green-800 text-sm mb-3">
                Your bot is now active and ready to receive messages from customers.
              </p>
              <div className="flex gap-3">
                <button className="text-sm text-green-700 underline hover:text-green-900">
                  Test your bot →
                </button>
                <button className="text-sm text-green-700 underline hover:text-green-900">
                  View conversation flow →
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-green-600 hover:text-green-800 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Rest of bot detail page */}
      <h1 className="text-2xl font-bold mb-4">Bot Details</h1>
      <p className="text-gray-600">Bot ID: {params.botId}</p>

      {/* TODO: Add actual bot details, status, conversations, etc. */}
    </div>
  );
}
```

#### Validation Checklist for Day 4

Test the complete wizard flow:
- [ ] Wizard loads with step 1
- [ ] Progress bar updates correctly
- [ ] Step indicators show current step
- [ ] Step 1 validates bot name
- [ ] Step 1 "Continue" button advances to step 2
- [ ] Step 2 shows dynamic form with all fields
- [ ] Step 2 validates required fields
- [ ] Step 2 "Back" button returns to step 1
- [ ] Step 2 "Continue" button advances to step 3
- [ ] Step 3 shows review summary
- [ ] Step 3 displays all field values correctly
- [ ] Step 3 "Create Bot" calls API
- [ ] Loading state shows while creating
- [ ] Success redirects to bot detail page
- [ ] Success message displays
- [ ] Error displays if API call fails
- [ ] Cancel button returns to templates page

---

### Day 5: Integration & Error Handling

**Goal:** Polish the integration and handle all edge cases

#### Step 5.1: Add Authentication Context

Create file: `botflow-website/app/contexts/AuthContext.tsx`

```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  organizationId: string | null;
  whatsappAccountId: string | null;
  isAuthenticated: boolean;
  login: (token: string, orgId: string, waId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [whatsappAccountId, setWhatsappAccountId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const storedToken = localStorage.getItem('token');
    const storedOrgId = localStorage.getItem('organizationId');
    const storedWaId = localStorage.getItem('whatsappAccountId');

    if (storedToken) setToken(storedToken);
    if (storedOrgId) setOrganizationId(storedOrgId);
    if (storedWaId) setWhatsappAccountId(storedWaId);
  }, []);

  const login = (newToken: string, orgId: string, waId: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('organizationId', orgId);
    localStorage.setItem('whatsappAccountId', waId);

    setToken(newToken);
    setOrganizationId(orgId);
    setWhatsappAccountId(waId);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('whatsappAccountId');

    setToken(null);
    setOrganizationId(null);
    setWhatsappAccountId(null);
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        organizationId,
        whatsappAccountId,
        isAuthenticated: !!token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

#### Step 5.2: Update Setup Page to Use Auth Context

Update the setup page to use the auth context instead of localStorage directly:

```typescript
// At the top of setup/page.tsx
import { useAuth } from '@/app/contexts/AuthContext';

// Inside component
const { token, organizationId, whatsappAccountId, isAuthenticated } = useAuth();

// In handleCreateBot function
if (!isAuthenticated) {
  router.push('/login?redirect=/dashboard/templates');
  return;
}

// Replace localStorage calls with context values
const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL}/api/bots/create-from-template`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      template_id: templateId,
      organization_id: organizationId,
      whatsapp_account_id: whatsappAccountId,
      bot_name: botName,
      field_values: fieldValues,
    }),
  }
);
```

#### Step 5.3: Add Loading Skeletons

Create file: `botflow-website/app/components/TemplateCardSkeleton.tsx`

```typescript
export function TemplateCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded"></div>
        <div className="w-16 h-6 bg-gray-200 rounded"></div>
      </div>
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
      <div className="h-10 bg-gray-200 rounded w-full"></div>
    </div>
  );
}
```

Use in templates page:
```typescript
{loading && (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <TemplateCardSkeleton key={i} />
    ))}
  </div>
)}
```

#### Step 5.4: Add Toast Notifications

Create file: `botflow-website/app/components/Toast.tsx`

```typescript
'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '⚠️',
    info: 'ℹ️',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
      <div className={`${styles[type]} border rounded-lg p-4 shadow-lg max-w-md`}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{icons[type]}</span>
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
```

#### Validation Checklist for Day 5

- [ ] Auth context provides token and IDs
- [ ] Unauthenticated users redirect to login
- [ ] Loading skeletons show while fetching
- [ ] Toast notifications work for errors
- [ ] API errors display user-friendly messages
- [ ] Network failures are handled gracefully
- [ ] Form data persists when going back
- [ ] Browser back button works correctly

---

### Day 6: Testing & Polish

**Goal:** Test complete flow and fix issues

#### Testing Script

Create file: `botflow-backend/test-week2-flow.md`

```markdown
# Week 2 End-to-End Testing Script

## Prerequisites
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] At least 1 template seeded
- [ ] Test user account created

## Test Flow

### 1. Template Discovery
- [ ] Navigate to /dashboard/templates
- [ ] Verify templates load
- [ ] Click each filter tab
- [ ] Verify counts match
- [ ] Click a template card
- [ ] Modal opens with details

### 2. Template Preview
- [ ] Example prompts display
- [ ] Required fields list appears
- [ ] Integrations show as badges
- [ ] Close modal with X button
- [ ] Close modal by clicking outside
- [ ] Press Escape key to close

### 3. Template Selection
- [ ] Click "Use This Template"
- [ ] Redirects to setup page
- [ ] Step 1 loads correctly
- [ ] Progress bar shows 33%

### 4. Bot Naming (Step 1)
- [ ] Enter bot name
- [ ] Try empty name (should error)
- [ ] Try 1-character name (should error)
- [ ] Try 51+ character name (should error)
- [ ] Enter valid name
- [ ] Click "Continue"
- [ ] Advances to step 2

### 5. Configuration (Step 2)
- [ ] All fields from template appear
- [ ] Required fields show * indicator
- [ ] Help text displays
- [ ] Try submitting empty (should error)
- [ ] Fill all required fields:
  - [ ] Text input works
  - [ ] Textarea works
  - [ ] Number input works
  - [ ] Select dropdown works
  - [ ] Multiselect checkboxes work
- [ ] Click "Back" button
- [ ] Returns to step 1
- [ ] Data persists (form not lost)
- [ ] Click "Continue" again
- [ ] Returns to step 2 with data
- [ ] Click "Continue" to step 3

### 6. Review (Step 3)
- [ ] Bot name displays
- [ ] Template displays
- [ ] All field values display
- [ ] Arrays show comma-separated
- [ ] Click "Back" twice
- [ ] Can navigate back to step 1
- [ ] Navigate forward to step 3
- [ ] Click "Create Bot"
- [ ] Loading state shows
- [ ] Button disables during creation

### 7. Success Flow
- [ ] Redirects to bot detail page
- [ ] Success message displays
- [ ] Bot ID is in URL
- [ ] Can dismiss success message

### 8. Error Handling
- [ ] Stop backend server
- [ ] Try to load templates
- [ ] Error message displays
- [ ] "Try Again" button works
- [ ] Start backend
- [ ] Templates load successfully

### 9. Mobile Responsiveness
- [ ] Resize browser to mobile
- [ ] Template grid shows 1 column
- [ ] Cards are readable
- [ ] Modal is scrollable
- [ ] Form inputs are accessible
- [ ] Navigation buttons stack correctly

### 10. Performance
- [ ] Template page loads < 2 seconds
- [ ] Modal opens instantly
- [ ] Form inputs respond immediately
- [ ] No console errors
- [ ] No memory leaks
```

#### Polish Tasks

1. **Add CSS animations**
   ```css
   @keyframes fade-in {
     from { opacity: 0; }
     to { opacity: 1; }
   }

   @keyframes slide-in {
     from { transform: translateY(20px); opacity: 0; }
     to { transform: translateY(0); opacity: 1; }
   }

   .animate-fade-in {
     animation: fade-in 0.3s ease-in-out;
   }

   .animate-slide-in {
     animation: slide-in 0.3s ease-out;
   }
   ```

2. **Add keyboard shortcuts**
   - Escape closes modals
   - Enter submits forms
   - Tab navigates fields properly

3. **Improve accessibility**
   - Add ARIA labels
   - Ensure focus management
   - Test with screen reader

4. **Add meta tags**
   ```typescript
   export const metadata = {
     title: 'Choose Template | BotFlow',
     description: 'Select a bot template for your business',
   };
   ```

---

### Day 7: Documentation

**Goal:** Document everything for Week 3

#### Step 7.1: Create Week 2 Summary

Create file: `WEEK_2_SUMMARY.md` (see example at end of guide)

#### Step 7.2: Update Component Documentation

Create file: `botflow-website/COMPONENTS.md`

```markdown
# Frontend Components Documentation

## Template System Components

### TemplateCard
Location: `app/components/TemplateCard.tsx`

Displays a template in card format with icon, name, tagline, and tier badge.

**Props:**
- `template` - Template object with id, name, icon, etc.
- `onClick` - Callback when card is clicked

**Usage:**
```typescript
<TemplateCard
  template={template}
  onClick={() => setSelected(template)}
/>
```

### TemplatePreviewModal
Location: `app/components/TemplatePreviewModal.tsx`

Modal that shows full template details before selection.

**Props:**
- `template` - Template object
- `onClose` - Callback to close modal
- `onSelect` - Callback with templateId when user selects

**Features:**
- Fetches full template details from API
- Shows example prompts, required fields, integrations
- Escape key closes modal
- Click outside closes modal

### DynamicForm
Location: `app/components/DynamicForm.tsx`

Generates form fields dynamically from template JSON.

**Supported field types:**
- text
- textarea
- number
- select
- multiselect
- time (basic support)
- json (basic support)

**Props:**
- `fields` - Record of field definitions from template
- `values` - Current form values
- `onChange` - Callback when field changes
- `errors` - Validation errors to display

**Usage:**
```typescript
<DynamicForm
  fields={template.required_fields}
  values={fieldValues}
  onChange={(name, value) => setFieldValues({...fieldValues, [name]: value})}
  errors={errors}
/>
```
```

#### Step 7.3: Create Troubleshooting Guide

Add to end of WEEK_2_GUIDE.md:

```markdown
## Common Issues & Solutions

### Templates not loading
**Symptoms:** Empty grid or loading forever
**Solutions:**
1. Check backend is running: `curl http://localhost:3001/health`
2. Check NEXT_PUBLIC_API_URL in .env.local
3. Check browser console for CORS errors
4. Verify templates exist: `curl http://localhost:3001/api/templates`

### Modal won't close
**Symptoms:** Can't dismiss template preview
**Solutions:**
1. Check if onClick event is propagating correctly
2. Ensure stopPropagation is called on modal content
3. Try Escape key
4. Refresh page as last resort

### Form validation not working
**Symptoms:** Can proceed with empty required fields
**Solutions:**
1. Check validateFieldValues function is imported
2. Verify template has required:true on fields
3. Check browser console for errors
4. Add console.log in validation function

### Bot creation fails with 401
**Symptoms:** "Unauthorized" error when creating bot
**Solutions:**
1. Check if user is logged in
2. Verify token is in localStorage
3. Check token is not expired
4. Ensure Authorization header is sent
5. Test token with: `curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/bots`

### Bot creation fails with 400
**Symptoms:** "Validation error" when creating bot
**Solutions:**
1. Check all required fields are filled
2. Verify field values match expected types
3. Check multiselect fields are arrays
4. Verify numbers are not strings
5. Review error details in response

### Styles not applying
**Symptoms:** Components look unstyled
**Solutions:**
1. Check Tailwind is configured
2. Verify className syntax is correct
3. Check for typos in class names
4. Restart dev server
5. Clear .next cache: `rm -rf .next`
```

---

## Success Checklist

Before moving to Week 3, verify:

### Functionality
- [ ] Can browse templates at /dashboard/templates
- [ ] Filter tabs work correctly
- [ ] Template preview modal shows full details
- [ ] All 7 field types render in dynamic form
- [ ] Form validation works (required, types, options)
- [ ] Multi-step wizard navigation works
- [ ] Can create bot via API successfully
- [ ] Success message displays after creation
- [ ] Error messages display on failures

### Code Quality
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Components are properly typed
- [ ] Code is commented where needed
- [ ] File structure is organized

### User Experience
- [ ] Loading states show appropriately
- [ ] Error states are user-friendly
- [ ] Mobile layout works properly
- [ ] Keyboard navigation works
- [ ] Animations are smooth

### Documentation
- [ ] Components documented
- [ ] API integration documented
- [ ] Week 2 summary created
- [ ] Troubleshooting guide written
- [ ] Code committed to git

---

## Resources

**Design References:**
- [Shopify App Store](https://apps.shopify.com) - Template cards
- [Zapier App Directory](https://zapier.com/apps) - Preview modals
- [Stripe Checkout](https://stripe.com/payments/checkout) - Multi-step wizards
- [Typeform](https://www.typeform.com) - Dynamic forms

**Component Libraries:**
- [Headless UI](https://headlessui.com) - Unstyled modal, tabs components
- [React Hook Form](https://react-hook-form.com) - Advanced form management
- [Tailwind UI](https://tailwindui.com) - Pre-built component patterns

**Documentation:**
- [Next.js App Router](https://nextjs.org/docs/app)
- [TailwindCSS](https://tailwindcss.com/docs)
- [TypeScript](https://www.typescriptlang.org/docs)

---

## Next Steps

**Week 3 Focus:** AI Template Execution Engine

You'll build:
1. Update message queue worker for templates
2. Conversation flow executor
3. Template-specific prompt injection
4. Context manager for conversation history
5. Integration hooks (maps, calendar, etc.)

**Preparation for Week 3:**
- Review message queue implementation (BullMQ)
- Study OpenAI API integration
- Understand conversation context management
- Review template conversation_flow structure

---

## Week 2 Summary

### What We Built

1. **Template Marketplace** (`/dashboard/templates`)
   - Grid layout with filtering
   - Tier-based organization
   - Loading and error states

2. **Template Card Component**
   - Visual template representation
   - Tier badge
   - Click to preview

3. **Template Preview Modal**
   - Full template details
   - Example prompts
   - Required fields preview
   - Integration badges

4. **Dynamic Form Generator**
   - 7 field types supported
   - Automatic rendering from JSON
   - Validation integration

5. **Multi-Step Wizard**
   - 3-step bot creation flow
   - Progress tracking
   - Data persistence
   - Form validation

6. **Success Flow**
   - Bot creation via API
   - Success confirmation
   - Error handling

### Key Features

- ✅ Dynamic form generation from template JSON
- ✅ Multi-step wizard with validation
- ✅ Responsive mobile design
- ✅ Loading and error states
- ✅ Success notifications
- ✅ Complete API integration

### Components Created

1. `TemplateCard.tsx` - Template display card
2. `TemplatePreviewModal.tsx` - Template details modal
3. `DynamicForm.tsx` - Dynamic form generator
4. `Toast.tsx` - Notification component
5. `TemplateCardSkeleton.tsx` - Loading skeleton
6. `/dashboard/templates/page.tsx` - Template marketplace
7. `/dashboard/templates/[id]/setup/page.tsx` - Setup wizard

### Utilities Created

1. `formValidation.ts` - Field validation helper
2. `AuthContext.tsx` - Authentication context

### Files Modified

1. Dashboard layout - Added templates navigation
2. `.env.local` - Added API URL
3. Bot detail page - Added success handling

---

**Week 2 Complete!** 🎉

The frontend onboarding flow is now complete. Users can:
- Browse 20+ templates
- Preview template details
- Fill dynamic configuration forms
- Create fully configured bots

**Ready for Week 3:** Making those bots actually respond to messages!

---

**Questions?** Review [CLAUDE.md](./CLAUDE.md) for architecture or [WEEK_1_GUIDE.md](./WEEK_1_GUIDE.md) for backend API details.
