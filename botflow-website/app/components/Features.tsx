import Image from 'next/image';

export default function Features() {
    const features = [
        {
            icon: '/icons/icon-bot-builder.png',
            title: 'No-Code Bot Builder',
            description: 'Create sophisticated bots with our intuitive visual builder. No technical skills needed.'
        },
        {
            icon: '/icons/icon-templates.png',
            title: 'Task-Specific Templates',
            description: 'Start fast with pre-built templates for bookings, orders, FAQs, and more.'
        },
        {
            icon: '/icons/icon-ai.png',
            title: 'AI-Powered Conversations',
            description: 'GPT-4 powered responses that understand context and deliver natural conversations.'
        },
        {
            icon: '/icons/icon-analytics.png',
            title: 'Real-Time Analytics',
            description: 'Track performance, measure satisfaction, and optimize your bots with actionable insights.'
        },
        {
            icon: '/icons/icon-integrations.png',
            title: 'Seamless Integrations',
            description: 'Connect to your CRM, calendar, e-commerce platform, and more.'
        },
        {
            icon: '/icons/icon-247.png',
            title: '24/7 Availability',
            description: 'Never miss a customer inquiry. Your AI agents work around the clock.'
        }
    ];

    return (
        <section id="features" className="py-24 px-6 bg-sand-DEFAULT/30 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-surf-light/10 rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-sunset-pink/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 translate-y-1/2"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16 space-y-4">
                    <h2 className="text-4xl lg:text-5xl font-extrabold text-dark-navy">
                        Why Choose <span className="text-surf-DEFAULT">BotFlow</span>?
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Everything you need to automate conversations effortlessly.
                        It's as easy as a day at the beach. 🏖️
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group p-8 rounded-3xl bg-white/60 backdrop-blur-xl border border-white/50 shadow-sm hover:shadow-xl hover:shadow-surf-light/20 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-surf-DEFAULT to-surf-dark flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md relative overflow-hidden">
                                <Image
                                    src={feature.icon}
                                    alt={feature.title}
                                    fill
                                    className="object-cover p-2"
                                />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-dark-navy group-hover:text-surf-dark transition-colors">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
