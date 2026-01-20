export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gray-50 py-16 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms of Service</h1>
                <p className="text-gray-600 mb-4">Last updated: January 2025</p>

                <div className="prose prose-gray max-w-none">
                    <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
                    <p className="text-gray-700 mb-4">
                        By accessing or using BotFlow, you agree to be bound by these Terms of Service.
                        If you do not agree, please do not use our service.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">2. Service Description</h2>
                    <p className="text-gray-700 mb-4">
                        BotFlow provides AI-powered WhatsApp automation services for businesses.
                        Our platform enables automated customer communication through the WhatsApp Business API.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">3. User Responsibilities</h2>
                    <p className="text-gray-700 mb-4">
                        You are responsible for maintaining the security of your account, complying with
                        WhatsApp&apos;s Business Policy and Commerce Policy, and ensuring your use of automated
                        messaging complies with applicable laws including POPIA.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">4. Acceptable Use</h2>
                    <p className="text-gray-700 mb-4">
                        You agree not to use BotFlow for spam, harassment, illegal activities, or any
                        purpose that violates WhatsApp&apos;s policies. We reserve the right to suspend accounts
                        that violate these terms.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">5. Pricing and Payment</h2>
                    <p className="text-gray-700 mb-4">
                        Subscription fees are billed monthly in South African Rand (ZAR).
                        Prices are subject to change with 30 days notice. Refunds are provided
                        in accordance with South African consumer protection laws.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">6. Service Availability</h2>
                    <p className="text-gray-700 mb-4">
                        We strive for 99.9% uptime but do not guarantee uninterrupted service.
                        Service depends on third-party providers including WhatsApp/Meta.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">7. Limitation of Liability</h2>
                    <p className="text-gray-700 mb-4">
                        BotFlow is not liable for indirect, incidental, or consequential damages.
                        Our liability is limited to the amount paid for the service in the preceding 12 months.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">8. Governing Law</h2>
                    <p className="text-gray-700 mb-4">
                        These terms are governed by the laws of the Republic of South Africa.
                        Disputes will be resolved in South African courts.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">9. Contact</h2>
                    <p className="text-gray-700 mb-4">
                        For questions about these terms, contact us at: support@botflow.co.za
                    </p>
                </div>
            </div>
        </div>
    );
}
