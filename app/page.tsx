import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import JourneySection from "@/components/JourneySection";
import EditorSection from "@/components/EditorSection";
import WikiTreeSection from "@/components/WikiTreeSection";
import FeaturesSection from "@/components/FeaturesSection";
import Pricing from "@/components/Pricing";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#050505] selection:bg-violet-500 selection:text-white">
      <Navbar />
      <Hero />
      <JourneySection />
      <EditorSection />
      <WikiTreeSection />
      <FeaturesSection />
      <Pricing />
      <Footer />
    </main>
  );
}
