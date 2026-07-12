import {
  Users,
  ShoppingBag,
  Package,
  Wallet,
  MessageCircle,
  HandCoins,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: Users,
    title: "CRM e Funil de Leads",
    description:
      "Cadastre clientes, acompanhe negociações e nunca perca um lead — inclusive os que chegam pelo WhatsApp.",
  },
  {
    icon: ShoppingBag,
    title: "PDV completo",
    description:
      "Frente de caixa com múltiplos pagamentos, desconto por item, venda para consumidor final e histórico editável.",
  },
  {
    icon: Package,
    title: "Estoque por lote",
    description:
      "Controle preciso de custo por lote, fornecedor e data de entrada. Análises de MarkUp, Curva ABC e Giro.",
  },
  {
    icon: Wallet,
    title: "Financeiro integrado",
    description:
      "Receitas e despesas conectadas às vendas, recorrências, recibos anexados e alertas de vencidos.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp no seu ERP",
    description:
      "Chat ao vivo, campanhas e integração automática com o CRM. Um clique transforma o lead em cliente.",
  },
  {
    icon: HandCoins,
    title: "Revendedoras e Consignação",
    description:
      "Envio, fechamento, comissão e pagamento automatizados. Baixa de estoque na entrega.",
  },
];

function FeatureCard({ icon: Icon, title, description }: Feature) {
  return (
    <div
      className="group relative rounded-2xl border border-white/5 bg-aurum-surface p-6 transition-all duration-300 hover:border-gold/30 hover:bg-aurum-surface-2 hover:-translate-y-1 hover:shadow-[0_0_40px_-10px_hsl(var(--gold)/0.25)]"
    >
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/10 text-gold mb-4 group-hover:bg-gold/15 transition">
        <Icon className="h-[22px] w-[22px]" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground pt-2 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="recursos"
      className="relative py-24 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-medium">
            Tudo em um só lugar
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mt-6 leading-tight">
            Um sistema pensado para{" "}
            <span className="text-gold">joalherias e lojas de semijoias</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto pt-4">
            Do balcão da loja à conversa no WhatsApp, o Aurum organiza cada
            detalhe do seu negócio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-16">
          {FEATURES.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
