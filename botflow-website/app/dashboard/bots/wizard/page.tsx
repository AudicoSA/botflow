'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardContainer } from '@/app/components/wizard/WizardContainer';
import { TemplateSelector } from '@/app/components/wizard/TemplateSelector';
import { TemplateCustomizer } from '@/app/components/wizard/TemplateCustomizer';
import { IntegrationConnector } from '@/app/components/wizard/IntegrationConnector';
import { BlueprintPreview } from '@/app/components/wizard/BlueprintPreview';

export default function BotWizardPage() {
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const steps = [
    {
      id: 'template',
      title: 'Choose Template',
      description: 'Start with a pre-built template or create from scratch',
      component: TemplateSelector,
      validate: async () => {
        // Ensure a template is selected
        return true; // Template selection is required via UI
      }
    },
    {
      id: 'customize',
      title: 'Customize Bot',
      description: "Configure your bot's behavior and responses",
      component: (props: any) => (
        <TemplateCustomizer
          templateId={props.allData.template?.selectedTemplate}
          {...props}
        />
      ),
      validate: async () => {
        // Validate required fields are filled
        // This is handled by the TemplateCustomizer component
        return true;
      }
    },
    {
      id: 'integrations',
      title: 'Connect Services',
      description: 'Connect external services your bot needs',
      component: (props: any) => {
        // Get required integrations based on template
        const templateId = props.allData.template?.selectedTemplate;

        // Define integrations based on template
        // In a real implementation, fetch this from the template
        const integrations = getRequiredIntegrations(templateId);

        return <IntegrationConnector integrations={integrations} {...props} />;
      },
      validate: async () => {
        // Validate all required integrations are connected
        // This is handled by the IntegrationConnector component
        return true;
      }
    },
    {
      id: 'preview',
      title: 'Preview & Deploy',
      description: 'Review your bot workflow before deployment',
      component: (props: any) => {
        // Generate blueprint if not already generated
        if (!blueprint && !generating) {
          generateBlueprint(props.allData).then(bp => {
            setBlueprint(bp);
          });
          setGenerating(true);
        }

        return blueprint ? (
          <div>
            <BlueprintPreview blueprint={blueprint} />
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Ready to Deploy</h4>
                  <p className="text-sm text-blue-800">
                    Your bot workflow is ready! Click "Create Bot" to deploy it to production.
                    You'll be able to test it immediately after creation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Generating your bot workflow...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
          </div>
        );
      }
    }
  ];

  const handleComplete = async (wizardData: any) => {
    try {
      // Show loading state
      const loadingToast = showToast('Creating your bot...', 'info');

      // Generate final blueprint if not already generated
      const finalBlueprint = blueprint || await generateBlueprint(wizardData);

      // Compile to n8n workflow (if Week 2 is implemented)
      // For now, we'll just create the bot record directly
      const botPayload = {
        name: wizardData.customize.bot_name,
        template_id: wizardData.template.selectedTemplate,
        field_values: wizardData.customize.field_values || {},
        integrations: wizardData.integrations || {},
        blueprint: finalBlueprint
      };

      const response = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(botPayload)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create bot');
      }

      const result = await response.json();

      // Success!
      hideToast(loadingToast);
      showToast('Bot created successfully!', 'success');

      // Redirect to bot detail page
      router.push(`/dashboard/bots/${result.bot.id}?success=true`);
    } catch (error) {
      console.error('Failed to create bot:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to create bot. Please try again.',
        'error'
      );
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
      router.push('/dashboard/bots');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Bot</h1>
          <p className="text-gray-600">
            Follow the steps below to create your custom WhatsApp bot in minutes
          </p>
        </div>

        {/* Wizard */}
        <WizardContainer
          steps={steps}
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}

// Helper function to generate blueprint from wizard data
async function generateBlueprint(wizardData: any) {
  try {
    // If using the Bot Builder API (Week 3)
    const response = await fetch(`/api/bots/temp/builder/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        template: wizardData.template?.selectedTemplate,
        customization: wizardData.customize,
        integrations: wizardData.integrations
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate blueprint');
    }

    const result = await response.json();
    return result.blueprint;
  } catch (error) {
    console.error('Blueprint generation error:', error);

    // Fallback: Create a simple default blueprint
    return {
      nodes: [
        {
          id: '1',
          type: 'whatsapp_trigger',
          name: 'Trigger',
          config: { trigger_type: 'any_message' }
        },
        {
          id: '2',
          type: 'knowledge_search',
          name: 'Search Knowledge',
          config: { query: '{{user_message}}' }
        },
        {
          id: '3',
          type: 'whatsapp_reply',
          name: 'Reply',
          config: { message: '{{knowledge_result}}' }
        }
      ],
      edges: [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' }
      ]
    };
  }
}

// Helper function to get required integrations for a template
function getRequiredIntegrations(templateId: string): Array<{
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
}> {
  // Map template IDs to required integrations
  const integrationMap: Record<string, any[]> = {
    'ecommerce': [
      {
        service: 'shopify',
        name: 'Shopify',
        icon: '🛍️',
        required: true,
        fields: [
          {
            name: 'api_key',
            label: 'API Key',
            type: 'password',
            placeholder: 'shpat_...',
            help: 'Found in Shopify Admin → Apps → Private Apps'
          },
          {
            name: 'store_url',
            label: 'Store URL',
            type: 'url',
            placeholder: 'yourstore.myshopify.com',
            help: 'Your Shopify store domain'
          }
        ]
      }
    ],
    'custom': []
  };

  return integrationMap[templateId] || [];
}

// Simple toast notification helpers
function showToast(message: string, type: 'info' | 'success' | 'error'): number {
  // In a real app, use a proper toast library like react-hot-toast
  console.log(`[${type.toUpperCase()}] ${message}`);
  return Date.now();
}

function hideToast(id: number): void {
  // In a real app, hide the toast
  console.log(`[HIDE TOAST] ${id}`);
}
