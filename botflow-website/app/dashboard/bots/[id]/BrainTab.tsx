'use client';

import { useState } from 'react';

interface BrainTabProps {
    systemPrompt: string;
    modelConfig: {
        provider: string;
        model: string;
        temperature: number;
    };
    onChange: (data: any) => void;
}

export default function BrainTab({ systemPrompt, modelConfig, onChange }: BrainTabProps) {
    const handleChange = (field: string, value: any) => {
        if (field === 'systemPrompt') {
            onChange({ systemPrompt: value });
        } else {
            onChange({
                modelConfig: {
                    ...modelConfig,
                    [field]: value
                }
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Bot Intelligence</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">System Instructions</label>
                        <p className="text-xs text-gray-500 mb-2">Define the bot's persona and behavior. Be specific.</p>
                        <textarea
                            value={systemPrompt || ''}
                            onChange={(e) => handleChange('systemPrompt', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent min-h-[200px] font-mono text-sm"
                            placeholder="You are a helpful assistant..."
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">AI Model Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                        <select
                            value={modelConfig?.model || 'gpt-4o'}
                            onChange={(e) => handleChange('model', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                        >
                            <option value="gpt-4o">GPT-4o (Smartest)</option>
                            <option value="gpt-4o-mini">GPT-4o Mini (Fastest)</option>
                            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Creativity (Temperature): {modelConfig?.temperature || 0.7}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={modelConfig?.temperature || 0.7}
                            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Precise</span>
                            <span>Balanced</span>
                            <span>Creative</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
