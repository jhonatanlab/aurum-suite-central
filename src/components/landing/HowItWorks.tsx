type Step = {
  number: string;
  title: string;
  description: string;
};

const STEPS: Step[] = [
  {
    number: "01",
    title: "Escolha seu plano",
    description:
      "Contrate o Starter ou Profissional em poucos cliques. Cobrança segura via Stripe.",
  },
  {
    number: "02",
    title: "Configure sua loja",
    description:
      "Cadastre produtos, fornecedores e equipe. Importe seu estoque atual se quiser.",
  },
  {
    number: "03",
    title: "Comece a vender",
    description:
      "PDV, WhatsApp, consignação e financeiro prontos pra rodar. Sem letra miúda.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="relative py-24 border-t border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-medium">
            Simples de começar
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mt-6 leading-tight">
            Do cadastro à primeira venda em{" "}
            <span className="text-gold">minutos</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto pt-4">
            Sem instalação, sem migração complexa. Você começa a usar o Aurum
            no mesmo dia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
          {STEPS.map((step, index) => {
            const isLast = index === STEPS.length - 1;
            return (
              <div
                key={step.number}
                className={
                  "relative text-center" +
                  (isLast
                    ? ""
                    : " md:before:absolute md:before:top-7 md:before:left-[calc(50%+2rem)] md:before:h-px md:before:w-[calc(100%-4rem)] md:before:bg-gradient-to-r md:before:from-gold/30 md:before:to-transparent")
                }
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/5 text-gold text-lg font-semibold">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-6">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
