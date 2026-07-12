import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";

export default function Landing() {
  return (
    <div className="min-h-screen bg-aurum text-foreground">
      <Navbar />
      <Hero />
    </div>
  );
}
