import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import FeaturesSection from "@/components/FeaturesSection";
import WikiTreeSection from "@/components/WikiTreeSection";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gray-50 selection:bg-blue-500 selection:text-white">
      <Navbar />
      <Hero />
      <WikiTreeSection />
      <FeaturesSection />
      <Pricing />
      <Footer />
    </main>
  );
}