import InteractiveGradient from "@/components/landing/InteractiveGradient";

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-aurum overflow-hidden">
      <InteractiveGradient />
      <main className="relative z-10 flex items-center justify-center min-h-screen">
        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-gold">
          Aurum Suite
        </h1>
      </main>
    </div>
  );
}
