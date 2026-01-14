import { useState } from 'react';

interface ConnectModalProps {
    type: string;
    initialData?: any;
    onClose: () => void;
    onConnect: (data: any) => Promise<void>;
}

export default function ConnectModal({ type, initialData, onClose, onConnect }: ConnectModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Record<string, string>>(initialData || {});

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
                                <option value="twilio">Twilio</option>
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
                        ) : formData.provider === 'twilio' ? (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
                                    <input
                                        name="accountSid"
                                        required
                                        className="w-full border rounded p-2"
                                        placeholder="AC..."
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
                                    <input
                                        name="authToken"
                                        required
                                        type="password"
                                        className="w-full border rounded p-2"
                                        placeholder="Auth Token"
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Phone Number</label>
                                    <input
                                        name="phoneNumber"
                                        required
                                        className="w-full border rounded p-2"
                                        placeholder="e.g. +1234567890"
                                        onChange={handleChange}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">If using sandbox, use the sandbox number.</p>
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
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Authentication</label>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.name) {
                                        alert('Please enter a name first');
                                        return;
                                    }
                                    const state = encodeURIComponent(JSON.stringify({ name: formData.name }));
                                    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/google-sheets/auth?state=${state}`;
                                }}
                                className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-all"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                {/* Trigger Vercel Deploy */}
                                Sign in with Google
                            </button>
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
                            {loading ? 'Connecting...' : (initialData ? 'Update' : 'Connect')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
