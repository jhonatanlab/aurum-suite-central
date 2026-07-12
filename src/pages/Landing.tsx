import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";

export default function Landing() {
  return (
    <div className="min-h-screen bg-aurum text-foreground">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
    </div>
  );
}
