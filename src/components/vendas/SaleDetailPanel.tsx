import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Receipt, User, CreditCard, Calendar, Package } from "lucide-react";
import { toast } from "sonner";

interface Sale {
  id: string;
  created_at: string;
  customer_name: string | null;
  client_id: string | null;
  payment_method: string | null;
  total: number;
  discount_value: number | null;
  status: string;
  seller_id: string | null;
  leads?: { name: string } | null;
}

interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  subtotal: number | null;
  products: { name: string } | null;
}

interface SaleDetailPanelProps {
  sale: Sale | null;
  items: SaleItem[];
  open: boolean;
  onClose: () => void;
}

const paymentMethodLabels: Record<string, string> = {
  pix: "PIX",
  credit: "Cartão de Crédito",
  debit: "Cartão de Débito",
  cash: "Dinheiro",
  boleto: "Boleto",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Concluída", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  refunded: { label: "Estornada", variant: "secondary" },
};

export function SaleDetailPanel({ sale, items, open, onClose }: SaleDetailPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const subtotal = items.reduce((acc, item) => {
    return acc + (item.subtotal || item.price * item.quantity);
  }, 0);

  const handlePrintReceipt = () => {
    if (!sale) return;
    
    const receiptWindow = window.open("", "_blank", "width=400,height=600");
    if (!receiptWindow) {
      toast.error("Não foi possível abrir a janela de impressão");
      return;
    }

    const receiptContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recibo - ${sale.id.slice(0, 8).toUpperCase()}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 20px; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 1.2em; }
          .footer { text-align: center; margin-top: 20px; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>RECIBO DE VENDA</h2>
          <p>Pedido: #${sale.id.slice(0, 8).toUpperCase()}</p>
          <p>${format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
        </div>
        <div class="divider"></div>
        <div>
          <p><strong>Cliente:</strong> ${sale.leads?.name || sale.customer_name || "Consumidor Final"}</p>
          <p><strong>Pagamento:</strong> ${paymentMethodLabels[sale.payment_method || ""] || sale.payment_method || "-"}</p>
        </div>
        <div class="divider"></div>
        <div>
          ${items.map(item => `
            <div class="item">
              <span>${item.quantity}x ${item.products?.name || "Produto"}</span>
              <span>${formatCurrency(item.subtotal || item.price * item.quantity)}</span>
            </div>
          `).join("")}
        </div>
        <div class="divider"></div>
        <div class="item">
          <span>Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${sale.discount_value && sale.discount_value > 0 ? `
          <div class="item">
            <span>Desconto:</span>
            <span>-${formatCurrency(sale.discount_value)}</span>
          </div>
        ` : ""}
        <div class="item total">
          <span>TOTAL:</span>
          <span>${formatCurrency(sale.total)}</span>
        </div>
        <div class="divider"></div>
        <div class="footer">
          <p>Obrigado pela preferência!</p>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptContent);
    receiptWindow.document.close();
  };

  if (!sale) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg bg-background border-border overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-bold text-foreground">
              Detalhes da Venda
            </SheetTitle>
            <Badge variant={statusLabels[sale.status]?.variant || "outline"}>
              {statusLabels[sale.status]?.label || sale.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Sale Info */}
          <div className="bg-secondary rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Receipt className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Pedido:</span>
              <span className="font-mono font-semibold">#{sale.id.slice(0, 8).toUpperCase()}</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Data:</span>
              <span>{format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Cliente:</span>
              <span>{sale.leads?.name || sale.customer_name || "Consumidor Final"}</span>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Pagamento:</span>
              <span>{paymentMethodLabels[sale.payment_method || ""] || sale.payment_method || "-"}</span>
            </div>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </h3>
            <div className="bg-secondary rounded-xl divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-foreground">{item.products?.name || "Produto"}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold text-foreground">
                    {formatCurrency(item.subtotal || item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            
            {sale.discount_value && sale.discount_value > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">-{formatCurrency(sale.discount_value)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(sale.total)}</span>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handlePrintReceipt}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Receipt className="h-4 w-4 mr-2" />
              Imprimir Recibo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
