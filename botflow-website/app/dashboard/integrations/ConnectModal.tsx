import { useState } from 'react';

interface ConnectModalProps {
    type: string;
    onClose: () => void;
    onConnect: (data: any) => Promise<void>;
}

export default function ConnectModal({ type, onClose, onConnect }: ConnectModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onConnect(formData);
            onClose();
        } catch (error) {
            console.error('Failed to connect:', error);
            // Optionally set error state here to show in UI
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const renderFields = () => {
        switch (type) {
            case 'whatsapp':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                            <select
                                name="provider"
                                className="w-full border rounded p-2"
                                value={formData.provider || 'meta'}
                                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            >
                                <option value="meta">Meta (Direct)</option>
                                <option value="bird">Bird (MessageBird)</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                            <input
                                name="name"
                                required
                                className="w-full border rounded p-2"
                                placeholder="My Business Number"
                                onChange={handleChange}
                            />
                        </div>

                        {formData.provider === 'bird' ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Key</label>
                                    <input
                                        name="accessKey"
                                        required
                                        type="password"
                                        className="w-full border rounded p-2"
                                        placeholder="Live API Key"
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Channel ID</label>
                                    <input
                                        name="channelId"
                                        required
                                        className="w-full border rounded p-2"
                                        placeholder="UUID"
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                                    <input
                                        name="accessToken"
                                        required
                                        type="password"
                                        className="w-full border rounded p-2"
                                        placeholder="EAAG..."
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
                                    <input
                                        name="phoneNumberId"
                                        required
                                        className="w-full border rounded p-2"
                                        placeholder="100..."
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">WABA ID</label>
                                    <input
                                        name="wabaId"
                                        required
                                        className="w-full border rounded p-2"
                                        placeholder="100..."
                                        onChange={handleChange}
                                    />
                                </div>
                            </>
                        )}
                    </>
                );
            case 'google_sheets':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Integration Name</label>
                            <input
                                name="name"
                                required
                                className="w-full border rounded p-2"
                                placeholder="My Sheets"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 mb-2">
                                For MVP, please paste your <strong>Service Account JSON</strong> here.
                            </div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Service Account JSON</label>
                            <textarea
                                name="serviceAccountJson"
                                required
                                rows={8}
                                className="w-full border rounded p-2 font-mono text-xs"
                                placeholder='{"type": "service_account", ...}'
                                onChange={(e) => setFormData({ ...formData, serviceAccountJson: e.target.value })}
                            />
                        </div>
                    </>
                );
            case 'stripe':
                return (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Integration Name</label>
                            <input
                                name="name"
                                required
                                className="w-full border rounded p-2"
                                placeholder="My Stripe"
                                onChange={handleChange}
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Secret Key</label>
                            <input
                                name="secretKey"
                                required
                                type="password"
                                className="w-full border rounded p-2"
                                placeholder="sk_live_..."
                                onChange={handleChange}
                            />
                        </div>
                    </>
                );
            default:
                return <p>Configuration not available for {type}</p>;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Connect {type === 'google_sheets' ? 'Google Sheets' : type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                <form onSubmit={handleSubmit}>
                    {renderFields()}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary-blue text-white rounded-lg hover:shadow-lg disabled:opacity-50"
                        >
                            {loading ? 'Connecting...' : 'Connect'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
