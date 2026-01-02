import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Receipt, User, CreditCard, Calendar, Package, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

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
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by_email?: string | null;
  leads?: { name: string } | null;
}

interface SaleItem {
  id: string;
  product_id: string;
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
  companyId?: string;
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

export function SaleDetailPanel({ sale, items, open, onClose, companyId }: SaleDetailPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const subtotal = items.reduce((acc, item) => {
    return acc + (item.subtotal || item.price * item.quantity);
  }, 0);

  const handleCancelSale = async () => {
    if (!sale || !user) return;
    
    setIsCancelling(true);
    try {
      // 1. Update sale status
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          status: "cancelled",
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellationReason || null,
        })
        .eq("id", sale.id);

      if (saleError) throw saleError;

      // 2. Restore stock for each item
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .maybeSingle();

        if (product) {
          const newStock = (product.stock || 0) + item.quantity;
          await supabase
            .from("products")
            .update({ stock: newStock })
            .eq("id", item.product_id);
        }
      }

      // 3. Mark financial transaction as cancelled (if exists)
      if (companyId) {
        await supabase
          .from("financial_transactions")
          .update({ status: "cancelled" })
          .eq("origin", `sale:${sale.id}`)
          .eq("company_id", companyId);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["sales-history"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });

      toast.success("Venda cancelada com sucesso! Estoque restaurado.");
      setShowCancelDialog(false);
      setCancellationReason("");
      onClose();
    } catch (error: any) {
      console.error("Error cancelling sale:", error);
      toast.error("Erro ao cancelar venda: " + error.message);
    } finally {
      setIsCancelling(false);
    }
  };

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

          {/* Cancellation Info */}
          {sale.status === "cancelled" && sale.cancelled_at && (
            <>
              <Separator className="bg-border" />
              <div className="bg-destructive/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-destructive font-medium">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Venda Cancelada</span>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Cancelada por <span className="font-medium text-foreground">{sale.cancelled_by_email || "Usuário"}</span> em {format(new Date(sale.cancelled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {sale.cancellation_reason && (
                    <p>Motivo: {sale.cancellation_reason}</p>
                  )}
                </div>
              </div>
            </>
          )}

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
            
            {sale.status === "completed" && (
              <Button
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Venda
              </Button>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-background border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Cancelar Venda
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja cancelar esta venda? Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Alterar o status da venda para "Cancelada"</li>
                <li>Restaurar o estoque dos produtos</li>
                <li>Marcar a movimentação financeira como cancelada</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancellation-reason" className="text-sm text-muted-foreground">
              Motivo do cancelamento (opcional)
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Informe o motivo do cancelamento..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setCancellationReason("");
                setShowCancelDialog(false);
              }}
              className="border-border"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelSale}
              disabled={isCancelling}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
