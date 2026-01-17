import Feature from './Feature';
import {
  Users,
  BookOpen,
  ShieldCheck,
  MapPinned,
  Share2,
} from 'lucide-react';

export default function FeaturesSection() {
  return (
    <section id="features" className="py-20 sm:py-28 bg-gray-50 relative">
      <div className="container mx-auto max-w-6xl px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">Why Genesis Gates?</h2>
        <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
          Inspired by top genealogy sites like Ancestry, FamilySearch and WikiTree, we
          combine the best of modern genealogy tools with a breathtaking spatial
          interface. Our features empower you to build, explore and preserve your
          family history with ease and privacy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Feature
            title="Collaborative Tree"
            description="Create and expand your family tree on an infinite canvas. Draw
            relationships with elegant lines and watch connections animate into place."
            icon={<Users className="h-6 w-6" />}
          />
          <Feature
            title="Rich Profiles"
            description="Chronicle each ancestor’s life with stories, dates and media.
            Upload photos, documents and records to preserve their legacy."
            icon={<BookOpen className="h-6 w-6" />}
          />
          <Feature
            title="Secure Ownership"
            description="Your data lives on your terms. Our decentralized backend with
            Supabase and row-level policies ensures only you can edit your tree.
            Share read‑only links safely."
            icon={<ShieldCheck className="h-6 w-6" />}
          />
          <Feature
            title="Insights & Records"
            description="Get hints to expand your tree. Search historical records and
            compare your ancestors against global trees. Export GEDCOM files easily."
            icon={<Share2 className="h-6 w-6" />}
          />
          <Feature
            title="Map & DNA"
            description="Plot ancestral migrations on an interactive globe and link DNA
            test results to discover living relatives."
            icon={<MapPinned className="h-6 w-6" />}
          />
        </div>
      </div>
    </section>
  );
}