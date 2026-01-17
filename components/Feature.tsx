import { ReactNode } from 'react';

interface FeatureProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export default function Feature({ title, description, icon }: FeatureProps) {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-white/5 border border-white/10 rounded-xl2 backdrop-blur-xl shadow-lg">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-zinc-300 leading-relaxed">
        {description}
      </p>
    </div>
  );
}