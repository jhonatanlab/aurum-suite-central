import { useState, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Rocket, Zap, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CheckoutFormModal from "@/components/pricing/CheckoutFormModal";

const plans = [
  {
    key: "starter",
    name: "Starter",
    price: "R$ 97",
    period: "/mês",
    description: "Para quem está começando a organizar seu negócio.",
    icon: Zap,
    features: [
      "1 usuário",
      "Até 100 produtos",
      "CRM",
      "Financeiro completo",
      "Suporte por e-mail",
      "Garantias & Lotes",
    ],
    available: true,
    popular: false,
  },
  {
    key: "profissional",
    name: "Profissional",
    price: "R$ 197",
    period: "/mês",
    description: "Para negócios em crescimento que precisam de mais recursos.",
    icon: Crown,
    features: [
      "Usuários ilimitados",
      "Produtos ilimitados",
      "CRM",
      "Módulo de Revendedores",
      "Até 50 Revendedores",
      "Suporte prioritário",
    ],
    available: true,
    popular: true,
  },
  {
    key: "growth",
    name: "Growth",
    price: "R$ 497",
    period: "/mês",
    description: "Para operações robustas com automações e escala.",
    icon: Rocket,
    features: [
      "Tudo do Profissional",
      "Automações avançadas",
      "Campanhas em massa",
      "Relatórios avançados",
      "API dedicada",
      "Gerente de conta",
    ],
    available: false,
    popular: false,
  },
];

export default function Pricing() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [modalPlan, setModalPlan] = useState<(typeof plans)[0] | null>(null);

  useEffect(() => {
    const loadCompanyId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("company_users").select("company_id").eq("user_id", user.id).maybeSingle();
        if (data) setCompanyId(data.company_id);
      }
    };
    loadCompanyId();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-16">
      <div className="text-center max-w-2xl mb-14">
        <Badge
          variant="outline"
          className="mb-4 border-primary/40 text-primary px-4 py-1 text-xs tracking-wider uppercase"
        >
          Planos
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Escolha o plano ideal para o seu negócio
        </h1>
        <p className="text-muted-foreground text-lg">Comece agora e escale conforme sua operação cresce.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.key}
              className={`relative flex flex-col transition-all duration-300 ${
                plan.popular
                  ? "border-primary shadow-[0_0_30px_-5px_hsl(var(--primary)/0.25)] scale-[1.03]"
                  : "border-border"
              } ${!plan.available ? "opacity-60" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-md">
                    Mais popular
                  </Badge>
                </div>
              )}

              <CardHeader className="pt-8 pb-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold text-foreground">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm mt-1">{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="text-center">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground/80">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                {plan.available ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => setModalPlan(plan)}
                  >
                    Assinar agora
                  </Button>
                ) : (
                  <Button className="w-full" variant="outline" disabled>
                    <Lock className="h-4 w-4 mr-2" />
                    Em breve
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {modalPlan && (
        <CheckoutFormModal
          open={!!modalPlan}
          onOpenChange={(open) => !open && setModalPlan(null)}
          planKey={modalPlan.key}
          planName={modalPlan.name}
          planPrice={modalPlan.price}
          companyId={companyId}
        />
      )}
    </div>
  );
}
