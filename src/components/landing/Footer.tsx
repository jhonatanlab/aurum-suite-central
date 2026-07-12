import { Instagram, Facebook, MessageCircle } from "lucide-react";

type LinkItem = { label: string; href: string };

const PRODUCT_LINKS: LinkItem[] = [
  { label: "Recursos", href: "#recursos" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

const COMPANY_LINKS: LinkItem[] = [
  { label: "Sobre", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Contato", href: "#" },
  { label: "Suporte", href: "#" },
];

const LEGAL_LINKS: LinkItem[] = [
  { label: "Termos de uso", href: "#" },
  { label: "Política de privacidade", href: "#" },
  { label: "Cookies", href: "#" },
];

function LinkColumn({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="space-y-3 pt-4">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-sm text-muted-foreground hover:text-gold transition"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className="relative bg-aurum border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <img
              src="/aurum-suite-logo.png"
              alt="Aurum Suite"
              className="h-8 w-auto"
            />
            <p className="text-sm text-muted-foreground pt-4 max-w-xs">
              O ERP feito para joalherias e lojas de semijoias que querem
              crescer com organização.
            </p>
          </div>

          <LinkColumn title="Produto" links={PRODUCT_LINKS} />
          <LinkColumn title="Empresa" links={COMPANY_LINKS} />
          <LinkColumn title="Legal" links={LEGAL_LINKS} />
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 Aurum Suite. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
            <a
              href="#"
              aria-label="Instagram"
              className="text-muted-foreground hover:text-gold transition"
            >
              <Instagram size={18} />
            </a>
            <a
              href="#"
              aria-label="Facebook"
              className="text-muted-foreground hover:text-gold transition"
            >
              <Facebook size={18} />
            </a>
            <a
              href="#"
              aria-label="WhatsApp"
              className="text-muted-foreground hover:text-gold transition"
            >
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
