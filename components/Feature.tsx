import { ReactNode } from 'react';

interface FeatureProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export default function Feature({ title, description, icon }: FeatureProps) {
  return (
    <div className="group flex h-full flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-md shadow-[0_0_40px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-violet-500/60 hover:bg-white/10">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(124,58,237,0.35)]">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{description}</p>
      </div>
    </div>
  );
}
