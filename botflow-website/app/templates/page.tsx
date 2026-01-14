
import { templates } from '@/lib/templatesData';
import LandingTemplateCard from '../components/LandingTemplateCard';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';

export default function AllTemplatesPage() {
    return (
        <main className="min-h-screen bg-background text-foreground">
            <Navigation />

            {/* Header Section */}
            <section className="relative pt-32 pb-20 overflow-hidden bg-gradient-to-br from-dark-navy to-surf-darker text-white">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-surf/20 rounded-full blur-[100px] animate-float"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6">
                        Explore Our <span className="text-surf-light">Template Galaxy</span>
                    </h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        A universe of automation possibilities. Find the perfect bot for your industry and launch in lightspeed.
                    </p>
                </div>
            </section>

            {/* Grid Section */}
            <section className="py-24 bg-gray-50 relative">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {templates.map((template, index) => (
                            <LandingTemplateCard key={template.slug} template={template} index={index} />
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
}
