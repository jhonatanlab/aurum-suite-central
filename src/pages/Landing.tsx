import InteractiveGradient from "@/components/landing/InteractiveGradient";

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-aurum text-foreground overflow-hidden">
      <InteractiveGradient />
      <section className="relative flex min-h-screen items-center justify-center px-6">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight gold-text">
          Aurum Suite
        </h1>
      </section>
    </div>
  );
}
