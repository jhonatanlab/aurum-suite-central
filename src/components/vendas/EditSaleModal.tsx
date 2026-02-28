import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Pencil, Save, Loader2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface SaleItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  subtotal: number | null;
  products: { name: string } | null;
}

interface SalePayment {
  id: string;
  payment_method: string;
  amount: number;
  installments: number | null;
  gateway_fee_amount: number | null;
  interest_amount: number | null;
}

interface Sale {
  id: string;
  created_at: string;
  customer_name: string | null;
  client_id: string | null;
  payment_method: string | null;
  total: number;
  subtotal: number | null;
  discount_value: number | null;
  client_freight: number | null;
  store_freight: number | null;
  status: string;
  seller_id: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  cancelled_by_email?: string | null;
  origin?: string | null;
  leads?: { name: string } | null;
}

interface EditSaleModalProps {
  sale: Sale;
  items: SaleItem[];
  payments: SalePayment[];
  open: boolean;
  onClose: () => void;
  companyId?: string;
}

const paymentMethodOptions = [
  { value: "pix", label: "PIX" },
  { value: "credit", label: "Cartão de Crédito" },
  { value: "debit", label: "Cartão de Débito" },
  { value: "cash", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "multiplo", label: "Múltiplo" },
];

export const originOptions = [
  { value: "loja", label: "Loja Física" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "indicacao", label: "Indicação" },
  { value: "site", label: "Site / E-commerce" },
  { value: "marketplace", label: "Marketplace" },
  { value: "outro", label: "Outro" },
];

export function EditSaleModal({ sale, items, payments, open, onClose, companyId }: EditSaleModalProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [clientFreight, setClientFreight] = useState("");
  const [storeFreight, setStoreFreight] = useState("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [origin, setOrigin] = useState("");
  const [editableItems, setEditableItems] = useState<Array<{ id: string; price: number; quantity: number; name: string }>>([]);

  // Initialize form when sale changes
  useEffect(() => {
    if (sale && open) {
      setCustomerName(sale.leads?.name || sale.customer_name || "");
      setPaymentMethod(sale.payment_method || "");
      setDiscountValue(String(sale.discount_value || 0));
      setClientFreight(String(sale.client_freight || 0));
      setStoreFreight(String(sale.store_freight || 0));
      setSaleDate(new Date(sale.created_at));
      setOrigin(sale.origin || "");
      setEditableItems(
        items.map((item) => ({
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          name: item.products?.name || "Produto",
        }))
      );
    }
  }, [sale, items, open]);

  const newSubtotal = useMemo(() => {
    return editableItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [editableItems]);

  const discount = parseFloat(discountValue) || 0;
  const cFreight = parseFloat(clientFreight) || 0;
  const newTotal = Math.max(0, newSubtotal - discount + cFreight);

  const updateItemField = (id: string, field: "price" | "quantity", value: number) => {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Update sale record
      const { error: saleError } = await supabase
        .from("sales")
        .update({
          customer_name: customerName || "Consumidor final",
          payment_method: paymentMethod,
          discount_value: discount,
          client_freight: cFreight,
          store_freight: parseFloat(storeFreight) || 0,
          subtotal: newSubtotal,
          total: newTotal,
          created_at: saleDate.toISOString(),
          origin: origin || null,
        } as any)
        .eq("id", sale.id);

      if (saleError) throw saleError;

      // 2. Update lead source if sale has a client
      if (sale.client_id && origin) {
        await supabase
          .from("leads")
          .update({ source: origin })
          .eq("id", sale.client_id);
      }

      // 3. Update sale items (price only)
      for (const item of editableItems) {
        const originalItem = items.find((i) => i.id === item.id);
        if (originalItem && (originalItem.price !== item.price)) {
          const { error: itemError } = await supabase
            .from("sale_items")
            .update({
              price: item.price,
              subtotal: item.price * item.quantity,
            })
            .eq("id", item.id);

          if (itemError) throw itemError;
        }
      }

      // 4. Update financial transaction value if exists
      if (companyId) {
        const { data: existingTx } = await supabase
          .from("financial_transactions")
          .select("id, value")
          .eq("origin", `sale:${sale.id}`)
          .eq("company_id", companyId)
          .eq("status", "pago")
          .maybeSingle();

        if (existingTx) {
          await supabase
            .from("financial_transactions")
            .update({
              value: newTotal,
              date: format(saleDate, "yyyy-MM-dd"),
              description: `Venda PDV #${sale.id.slice(0, 8)} (editada)`,
            })
            .eq("id", existingTx.id);
        }
      }

      // Invalidate queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales-history"] }),
        queryClient.invalidateQueries({ queryKey: ["sale-details"] }),
        queryClient.invalidateQueries({ queryKey: ["financial_transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["financial-transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-chart"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent-sales"] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
      ]);

      toast.success("Venda atualizada com sucesso!");
      onClose();
    } catch (error: any) {
      console.error("Error updating sale:", error);
      toast.error("Erro ao atualizar venda: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg bg-background border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Venda #{sale.id.slice(0, 8).toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Altere os dados da venda conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sale Date */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Data da Venda</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-secondary border-border",
                    !saleDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {saleDate ? format(saleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={saleDate}
                  onSelect={(date) => date && setSaleDate(date)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Customer */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Nome do Cliente</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Consumidor final"
              className="bg-secondary border-border"
            />
          </div>

          {/* Origin */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Origem</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {originOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Forma de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {paymentMethodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-border" />

          {/* Items */}
          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground font-semibold">Itens da Venda</Label>
            {editableItems.map((item) => (
              <div key={item.id} className="bg-secondary rounded-xl p-3 space-y-2">
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItemField(item.id, "quantity", parseInt(e.target.value) || 1)}
                      className="bg-card border-border h-9 text-sm"
                      disabled
                      title="Quantidade não pode ser alterada (afeta estoque)"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateItemField(item.id, "price", parseFloat(e.target.value) || 0)}
                      className="bg-card border-border h-9 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  Subtotal: {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>

          <Separator className="bg-border" />

          {/* Discount & Freight */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Desconto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Frete Cliente (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={clientFreight}
                onChange={(e) => setClientFreight(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Frete Loja (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={storeFreight}
              onChange={(e) => setStoreFreight(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <Separator className="bg-border" />

          {/* Totals Summary */}
          <div className="bg-secondary rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal Produtos</span>
              <span>{formatCurrency(newSubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">-{formatCurrency(discount)}</span>
              </div>
            )}
            {cFreight > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete Cliente</span>
                <span>{formatCurrency(cFreight)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Novo Total</span>
              <span className="text-primary">{formatCurrency(newTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} className="border-border">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
