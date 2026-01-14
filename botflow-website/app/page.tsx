import Hero from './components/Hero';
import TemplatesSection from './components/TemplatesSection';
import Features from './components/Features';
import Pricing from './components/Pricing';
import Waitlist from './components/Waitlist';
import Footer from './components/Footer';
import Navigation from './components/Navigation';

export default function Home() {
    return (
        <main className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <Navigation />
            <Hero />
            <TemplatesSection />
            <Features />
            <Pricing />
            <Waitlist />
            <Footer />
        </main>
    );
}
