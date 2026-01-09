'use client';

import { useState, useEffect, useCallback } from 'react';

interface KnowledgeBaseTabProps {
    botId: string;
}

export default function KnowledgeBaseTab({ botId }: KnowledgeBaseTabProps) {
    const [sources, setSources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [inputType, setInputType] = useState<'url' | 'text'>('url');

    const fetchSources = useCallback(async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge`);
            if (res.ok) {
                const data = await res.json();
                setSources(data.sources);
            }
        } catch (error) {
            console.error('Failed to fetch sources:', error);
        } finally {
            setLoading(false);
        }
    }, [botId]);

    useEffect(() => {
        fetchSources();
    }, [fetchSources]);

    const handleAddSource = async () => {
        if (!inputValue) return;
        setUploading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceType: inputType,
                    content: inputValue,
                    metadata: { addedAt: new Date().toISOString() }
                })
            });

            if (res.ok) {
                setInputValue('');
                fetchSources();
            } else {
                alert('Failed to add source');
            }
        } catch (error) {
            console.error('Error adding source:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this source?')) return;
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchSources();
            } else {
                alert('Failed to delete source');
            }
        } catch (error) {
            console.error('Error deleting source:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // For MVP, we read file as text. In future, use FormData for binary.
        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            setUploading(true);
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
                const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sourceType: 'file',
                        content: text, // Storing raw text for now
                        metadata: { filename: file.name, size: file.size, type: file.type }
                    })
                });

                if (res.ok) {
                    fetchSources();
                } else {
                    alert('Failed to upload file');
                }
            } finally {
                setUploading(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Add New Source */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Add Knowledge</h3>

                <div className="flex gap-4 mb-4">
                    <button
                        onClick={() => setInputType('url')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'url' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Website URL
                    </button>
                    <button
                        onClick={() => setInputType('text')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inputType === 'text' ? 'bg-primary-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Raw Text
                    </button>
                    <label className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer">
                        Upload File
                        <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md,.csv,.json" />
                    </label>
                </div>

                <div className="flex gap-2">
                    {inputType === 'url' && (
                        <input
                            type="url"
                            placeholder="https://example.com/pricing"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    )}
                    {inputType === 'text' && (
                        <textarea
                            placeholder="Paste your FAQ or policy text here..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg min-h-[80px]"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    )}
                    <button
                        onClick={handleAddSource}
                        disabled={uploading || !inputValue}
                        className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50"
                    >
                        {uploading ? 'Adding...' : 'Add'}
                    </button>
                </div>
            </div>

            {/* List Sources */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Knowledge Sources ({sources.length})</h3>
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Loading sources...</div>
                ) : sources.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No knowledge sources added yet.</div>
                ) : (
                    <div className="space-y-3">
                        {sources.map((source) => (
                            <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${source.source_type === 'url' ? 'bg-blue-100 text-blue-700' :
                                            source.source_type === 'file' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-700'
                                        }`}>
                                        {source.source_type}
                                    </span>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium text-gray-900 truncate" title={source.content}>
                                            {source.metadata?.filename || source.content.substring(0, 50) + (source.content.length > 50 ? '...' : '')}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            Status: <span className={source.status === 'indexed' ? 'text-green-600' : 'text-yellow-600'}>{source.status}</span>
                                            {' • '}
                                            {new Date(source.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(source.id)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                    title="Remove source"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
