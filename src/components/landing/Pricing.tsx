import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href?: string;
  highlight?: boolean;
  disabled?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "R$ 97",
    description: "Para lojas começando a organizar a gestão.",
    features: [
      "1 usuário",
      "Até 100 produtos",
      "CRM e Funil de Leads",
      "PDV completo",
      "Estoque por lote",
      "Garantias",
      "Dashboard e relatórios",
    ],
    cta: "Assinar Starter",
    href: "/billing",
  },
  {
    name: "Profissional",
    price: "R$ 197",
    description: "Para lojas com equipe e revendedoras.",
    features: [
      "Até 5 usuários",
      "Produtos ilimitados",
      "Até 20 revendedoras",
      "Tudo do Starter, mais:",
      "Consignação e Fechamentos",
      "Comissões automatizadas",
      "Financeiro completo",
      "Suporte prioritário",
    ],
    cta: "Assinar Profissional",
    href: "/billing",
    highlight: true,
  },
  {
    name: "Growth",
    price: "Em breve",
    description: "WhatsApp, IA e automações para escalar.",
    features: [
      "Tudo do Profissional",
      "WhatsApp integrado (chat e campanhas)",
      "Automações e disparos",
      "IA para atendimento",
      "Recursos avançados",
    ],
    cta: "Em breve",
    disabled: true,
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  const baseClasses =
    "relative flex flex-col rounded-2xl border p-6 bg-aurum-surface transition-all";
  const highlightClasses = plan.highlight
    ? "border-gold md:scale-105 shadow-[0_0_50px_-10px_hsl(var(--gold)/0.3)]"
    : "border-white/5";

  return (
    <div className={`${baseClasses} ${highlightClasses}`}>
      {plan.highlight && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-aurum text-xs font-semibold px-3 py-1 rounded-full">
          Mais popular
        </span>
      )}

      <div className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        {plan.name}
      </div>

      <div className="pt-3 flex items-baseline gap-2">
        <span className="text-4xl font-semibold text-foreground">
          {plan.price}
        </span>
        {!plan.disabled && (
          <span className="text-sm text-muted-foreground">/mês</span>
        )}
      </div>

      <p className="text-sm text-muted-foreground pt-1">{plan.description}</p>

      <div className="border-t border-white/5 my-6" />

      <ul className="space-y-3 text-sm flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-foreground/90">
            <Check className="h-4 w-4 text-gold flex-none mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {plan.disabled ? (
          <Button
            disabled
            variant="outline"
            className="w-full text-muted-foreground cursor-not-allowed"
          >
            {plan.cta}
          </Button>
        ) : plan.highlight ? (
          <Button
            asChild
            className="w-full bg-gold text-aurum hover:bg-gold-soft"
          >
            <a href={plan.href}>{plan.cta}</a>
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            className="w-full border-white/10 hover:border-gold/30"
          >
            <a href={plan.href}>{plan.cta}</a>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Pricing() {
  return (
    <section id="planos" className="relative py-24 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-medium">
            Planos e preços
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mt-6 leading-tight">
            Escolha o plano ideal para{" "}
            <span className="text-gold">sua joalheria</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto pt-4">
            Comece pequeno e evolua conforme sua loja cresce. Sem letra miúda,
            sem taxas escondidas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 items-stretch">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-8 text-center">
          Todos os planos incluem atualizações contínuas. Cancele quando quiser.
        </p>
      </div>
    </section>
  );
}
