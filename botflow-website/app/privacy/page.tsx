export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-16 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
                <p className="text-gray-600 mb-4">Last updated: January 2025</p>

                <div className="prose prose-gray max-w-none">
                    <h2 className="text-xl font-semibold mt-6 mb-3">1. Information We Collect</h2>
                    <p className="text-gray-700 mb-4">
                        BotFlow collects information you provide directly, including your name, email address,
                        business information, and WhatsApp Business account details when you register for our service.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">2. How We Use Your Information</h2>
                    <p className="text-gray-700 mb-4">
                        We use your information to provide and improve our WhatsApp automation services,
                        process transactions, send service communications, and comply with legal obligations.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">3. WhatsApp Data</h2>
                    <p className="text-gray-700 mb-4">
                        When you connect your WhatsApp Business account, we access message data to provide
                        automated responses. We do not sell or share your WhatsApp conversations with third parties.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">4. Data Security</h2>
                    <p className="text-gray-700 mb-4">
                        We implement industry-standard security measures to protect your data, including
                        encryption in transit and at rest, secure authentication, and regular security audits.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">5. POPIA Compliance</h2>
                    <p className="text-gray-700 mb-4">
                        BotFlow complies with the Protection of Personal Information Act (POPIA) of South Africa.
                        You have the right to access, correct, or delete your personal information.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">6. Contact Us</h2>
                    <p className="text-gray-700 mb-4">
                        For privacy-related inquiries, contact us at: privacy@botflow.co.za
                    </p>
                </div>
            </div>
        </div>
    );
}
