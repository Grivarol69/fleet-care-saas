import { Header } from './header';
import { HeroSection } from './hero-section';
import { StatsSection } from './stats-section';
import { FeaturesSection } from './features-section';
import { TestimonialsSection } from './testimonials-section';
import { IntegrationsSection } from './integrations-section';
import { NewsSection } from './news-section';
import { FAQSection } from './faq-section';
import { Footer } from './footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <TestimonialsSection />
        <IntegrationsSection />
        <NewsSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  );
}

export {
  HeroSection,
  StatsSection,
  FeaturesSection,
  TestimonialsSection,
  IntegrationsSection,
  NewsSection,
};
