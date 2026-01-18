import {
  ClipboardList,
  Gauge,
  LockKeyhole,
  PanelsTopLeft,
} from "lucide-react";

const steps = [
  {
    title: "Secure onboarding",
    description:
      "Glassmorphism login toggles between Sign In and Sign Up with Supabase auth and instant profile creation.",
    icon: <LockKeyhole className="h-6 w-6" />,
  },
  {
    title: "Dashboard hub",
    description:
      "See every family tree in one grid, with tier-aware Create New actions and simple delete controls.",
    icon: <PanelsTopLeft className="h-6 w-6" />,
  },
  {
    title: "Family Flow editor",
    description:
      "Spend 90% of your time on an infinite canvas with gender-coded nodes, curved connections, and live search.",
    icon: <Gauge className="h-6 w-6" />,
  },
  {
    title: "Sidebar intelligence",
    description:
      "Edit profiles, timeline events, gallery images, and biographies in a right-hand drawer.",
    icon: <ClipboardList className="h-6 w-6" />,
  },
];

export default function JourneySection() {
  return (
    <section id="journey" className="relative py-24">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.14),_transparent_60%)]" />
      <div className="relative container mx-auto px-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-violet-400">User Journey</p>
          <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            A guided flow from login to legacy
          </h2>
          <p className="mt-4 text-base text-slate-400">
            Every screen is designed to feel like a futuristic data room, with glass panels and
            silky transitions that keep you in control.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-md shadow-[0_0_30px_rgba(15,23,42,0.35)]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 text-violet-300">
                {step.icon}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
