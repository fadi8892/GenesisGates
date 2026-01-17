import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/hero.png"
          alt="Cinematic genealogical network"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        {/* overlay */}
        <div className="absolute inset-0 bg-black/30" />
      </div>
      <div className="container mx-auto max-w-6xl px-6 py-20 sm:py-32 text-center">
        <h1 className="text-balance text-4xl font-bold sm:text-6xl leading-tight">
          Build &amp; preserve your family legacy
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-200">
          Genesis Gates is a decentralized operating system for your ancestry. Explore
          your family history on an infinite canvas, craft rich chronicles and
          secure your legacy for future generations.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Link href="#features" className="group inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-white font-medium hover:bg-accent-hover transition-colors">
            Learn more
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link href="/vault/demo" className="inline-flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 px-6 py-3 text-gray-800 font-medium hover:bg-gray-200 transition-colors">
            View a demo
          </Link>
        </div>
      </div>
    </section>
  );
}