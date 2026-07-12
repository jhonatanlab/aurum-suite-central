import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveGradient from "./InteractiveGradient";
import DashboardMockup from "./DashboardMockup";

export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <InteractiveGradient />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
              </span>
              ERP para joalherias e semijoias
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground leading-[1.05]">
              A gestão da sua loja de joias e semijoias,
              <br />
              <span className="text-gold">do balcão ao WhatsApp.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl">
              CRM, PDV, estoque por lote, financeiro e WhatsApp em um só
              painel. Feito para lojistas que vendem semijoias e joias em loja física,
              online e por revendedoras.
            </p>

            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                asChild
                size="lg"
                className="bg-gold text-aurum hover:bg-gold-soft"
              >
                <a href="/billing">
                  Começar agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-gold/30 text-foreground hover:bg-gold/5 hover:text-foreground"
              >
                <a href="#planos">Ver planos</a>
              </Button>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <div className="flex -space-x-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full bg-gold/20 border-2 border-aurum"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Lojistas de semijoias em todo o Brasil confiam no Aurum
              </p>
            </div>
          </div>

          {/* Right column */}
          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
