import Hero from "@/components/Hero";
import FeaturesSection from "@/components/FeaturesSection";
import WikiTreeSection from "@/components/WikiTreeSection";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Hero />
      {/* Insert the new WikiTree section here */}
      <WikiTreeSection />
      <FeaturesSection />
      <Pricing />
      <Footer />
    </main>
  );
}