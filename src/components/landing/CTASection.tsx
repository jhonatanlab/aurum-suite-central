import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import InteractiveGradient from "@/components/landing/InteractiveGradient";

export default function CTASection() {
  return (
    <section className="relative overflow-hidden py-24 border-t border-white/5">
      <InteractiveGradient />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-foreground">
          Pronto para modernizar <br />
          <span className="text-gold">sua joalheria?</span>
        </h2>
        <p className="text-lg text-muted-foreground pt-6 max-w-2xl mx-auto">
          Junte-se a lojistas de semijoias que já organizaram estoque, vendas e
          WhatsApp em um só painel.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            size="lg"
            asChild
            className="bg-gold text-aurum hover:bg-gold-soft"
          >
            <a href="/billing">
              Começar agora
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="border-white/10"
          >
            <a href="#planos">Ver planos</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
