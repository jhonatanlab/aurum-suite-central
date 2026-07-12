import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "O Aurum funciona para lojas com mais de um vendedor?",
    a: "Sim. O plano Profissional suporta até 5 usuários simultâneos, cada um com seu login e permissões separadas.",
  },
  {
    q: "Como funciona o controle de estoque por lote?",
    a: "Cada entrada de produto gera um lote com custo, fornecedor e data próprios. As vendas dão baixa em ordem FIFO (primeiro que entrou, primeiro que sai), garantindo o custo real de cada peça.",
  },
  {
    q: "O WhatsApp está incluso em qual plano?",
    a: "A integração completa com WhatsApp (chat ao vivo, campanhas e automações) está no plano Growth, ainda em fase de lançamento. Você será avisado assim que ficar disponível.",
  },
  {
    q: "Preciso migrar meus dados manualmente?",
    a: "Não. Nosso time ajuda na importação inicial de produtos, clientes e estoque. Você começa a operar com sua base já dentro do Aurum.",
  },
  {
    q: "Consigo controlar revendedoras que vendem meus produtos?",
    a: "Sim. O módulo de Consignação registra cada envio, permite fechamentos parciais, calcula comissão automaticamente e gera a despesa no financeiro quando você paga.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Pode. O cancelamento é feito direto no painel e mantém seu acesso até o fim do ciclo já pago. Sem multa, sem burocracia.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="relative py-24 border-t border-white/5">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs font-medium">
            Dúvidas frequentes
          </div>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mt-6 leading-tight">
            Tudo o que você precisa <span className="text-gold">saber</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto pt-4">
            Se ficou alguma pergunta, fale com a gente pelo WhatsApp.
          </p>
        </div>

        <Accordion type="single" collapsible className="pt-12">
          {FAQS.map((item, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border-b border-white/5"
            >
              <AccordionTrigger className="text-left text-base font-medium hover:text-gold hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
