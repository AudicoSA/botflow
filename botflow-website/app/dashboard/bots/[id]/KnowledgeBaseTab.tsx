'use client';

import { useState, useEffect, useCallback } from 'react';

interface KnowledgeBaseTabProps {
    botId: string;
}

interface KnowledgeSource {
    id: string;
    title: string;
    category: string;
    metadata: {
        source_type?: string;
        file_name?: string;
        url?: string;
        status?: string;
        chunks_created?: number;
        error_message?: string;
        [key: string]: unknown;
    };
    created_at: string;
    chunk_count?: number;
}

// Helper to get auth token
const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('botflow_token');
    }
    return null;
};

export default function KnowledgeBaseTab({ botId }: KnowledgeBaseTabProps) {
    const [sources, setSources] = useState<KnowledgeSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [retrying, setRetrying] = useState<string | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [inputType, setInputType] = useState<'url' | 'text'>('url');

    const fetchSources = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) {
                setLoading(false);
                return;
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Backend returns { articles: [...] }
                setSources(data.articles || data.sources || []);
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
        if (!inputValue.trim()) return;

        const token = getAuthToken();
        if (!token) {
            alert('Please login to continue');
            return;
        }

        setUploading(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Use the source endpoint for URL and text
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge/source`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    source_type: inputType,
                    content: inputValue.trim(),
                    title: inputType === 'url' ? inputValue.trim() : `Text added ${new Date().toLocaleDateString()}`
                })
            });

            if (res.ok) {
                setInputValue('');
                fetchSources();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.error || 'Failed to add source');
            }
        } catch (error) {
            console.error('Error adding source:', error);
            alert('Failed to add source');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this source?')) return;

        const token = getAuthToken();
        if (!token) {
            alert('Please login to continue');
            return;
        }

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
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

    const handleRetry = async (source: KnowledgeSource) => {
        const token = getAuthToken();
        if (!token) {
            alert('Please login to continue');
            return;
        }

        // Get URL from metadata
        const url = source.metadata?.url;
        if (!url) {
            alert('Cannot retry: no URL found for this source');
            return;
        }

        setRetrying(source.id);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // First delete the failed source
            await fetch(`${apiUrl}/api/bots/${botId}/knowledge/${source.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // Re-add it
            const res = await fetch(`${apiUrl}/api/bots/${botId}/knowledge/source`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    source_type: 'url',
                    content: url,
                    title: url
                })
            });

            if (res.ok) {
                fetchSources();
            } else {
                const errorData = await res.json().catch(() => ({}));
                alert(errorData.error || 'Failed to retry');
            }
        } catch (error) {
            console.error('Error retrying source:', error);
            alert('Failed to retry');
        } finally {
            setRetrying(null);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const token = getAuthToken();
        if (!token) {
            alert('Please login to continue');
            return;
        }

        // Check file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        setUploading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

            // Determine file type
            let fileType = file.type;
            if (!fileType || fileType === '') {
                if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                    fileType = 'text/plain';
                } else if (file.name.endsWith('.pdf')) {
                    fileType = 'application/pdf';
                } else if (file.name.endsWith('.docx')) {
                    fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                }
            }

            // Step 1: Initialize upload to get signed URL
            const initRes = await fetch(`${apiUrl}/api/bots/${botId}/knowledge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    file_name: file.name,
                    file_size: file.size,
                    file_type: fileType
                })
            });

            if (!initRes.ok) {
                const errorData = await initRes.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to initialize upload');
            }

            const { article_id, upload_url } = await initRes.json();

            // Step 2: Upload file to Supabase Storage using signed URL
            const uploadRes = await fetch(upload_url, {
                method: 'PUT',
                headers: {
                    'Content-Type': fileType
                },
                body: file
            });

            if (!uploadRes.ok) {
                throw new Error('Failed to upload file to storage');
            }

            // Step 3: Trigger processing
            const processRes = await fetch(`${apiUrl}/api/bots/${botId}/knowledge/${article_id}/process`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!processRes.ok) {
                console.warn('Processing trigger failed, but file was uploaded');
            }

            fetchSources();
            // Reset file input
            e.target.value = '';
        } catch (err: unknown) {
            console.error('Error uploading file:', err);
            alert(err instanceof Error ? err.message : 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    // Helper to get source type from metadata or category
    const getSourceType = (source: KnowledgeSource): string => {
        if (source.metadata?.source_type) return source.metadata.source_type;
        if (source.category === 'uploaded_document') return 'file';
        if (source.category === 'website') return 'url';
        if (source.category === 'manual_text') return 'text';
        return source.category || 'unknown';
    };

    // Helper to get display title
    const getDisplayTitle = (source: KnowledgeSource): string => {
        if (source.metadata?.file_name) return source.metadata.file_name;
        if (source.metadata?.url) return source.metadata.url;
        if (source.title) return source.title.length > 50 ? source.title.substring(0, 50) + '...' : source.title;
        return 'Unknown source';
    };

    // Helper to get status
    const getStatus = (source: KnowledgeSource): string => {
        return source.metadata?.status || 'pending';
    };

    return (
        <div className="space-y-6">
            {/* Add New Source */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Add Knowledge</h3>

                <div className="flex flex-wrap gap-4 mb-4">
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
                    <label className={`px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {uploading ? 'Uploading...' : 'Upload File'}
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".txt,.md,.pdf,.docx"
                            disabled={uploading}
                        />
                    </label>
                </div>

                <div className="flex gap-2">
                    {inputType === 'url' && (
                        <input
                            type="url"
                            placeholder="https://example.com/pricing"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    )}
                    {inputType === 'text' && (
                        <textarea
                            placeholder="Paste your FAQ or policy text here..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg min-h-[80px] focus:ring-2 focus:ring-primary-blue focus:border-transparent"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                    )}
                    <button
                        onClick={handleAddSource}
                        disabled={uploading || !inputValue.trim()}
                        className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? 'Adding...' : 'Add'}
                    </button>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                    Supported: Website URLs, plain text, PDF, TXT, MD, DOCX files (max 10MB)
                </p>
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
                        {sources.map((source) => {
                            const sourceType = getSourceType(source);
                            const status = getStatus(source);
                            return (
                                <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sourceType === 'url' ? 'bg-blue-100 text-blue-700' :
                                            sourceType === 'file' ? 'bg-orange-100 text-orange-700' :
                                                sourceType === 'text' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-gray-200 text-gray-700'
                                            }`}>
                                            {sourceType}
                                        </span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-gray-900 truncate" title={source.title}>
                                                {getDisplayTitle(source)}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Status: <span className={
                                                    status === 'indexed' ? 'text-green-600' :
                                                        status === 'processing' ? 'text-blue-600' :
                                                            status === 'failed' ? 'text-red-600' :
                                                                'text-yellow-600'
                                                }>{status}</span>
                                                {source.chunk_count !== undefined && source.chunk_count > 0 && (
                                                    <span className="ml-2 text-gray-400">({source.chunk_count} chunks)</span>
                                                )}
                                                {' • '}
                                                {new Date(source.created_at).toLocaleDateString()}
                                            </span>
                                            {status === 'failed' && source.metadata?.error_message && (
                                                <span className="text-xs text-red-500 mt-1" title={source.metadata.error_message}>
                                                    Error: {source.metadata.error_message.length > 80
                                                        ? source.metadata.error_message.substring(0, 80) + '...'
                                                        : source.metadata.error_message}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {status === 'failed' && source.metadata?.url && (
                                            <button
                                                onClick={() => handleRetry(source)}
                                                disabled={retrying === source.id}
                                                className="text-blue-500 hover:text-blue-700 p-2 disabled:opacity-50"
                                                title="Retry processing"
                                            >
                                                {retrying === source.id ? (
                                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}
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
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
