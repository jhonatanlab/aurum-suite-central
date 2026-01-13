import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Minus, Plus, ShoppingCart, Loader2 } from "lucide-react";
import { ConsignmentItem } from "@/hooks/useConsignment";

interface GroupedProduct {
  product_id: string;
  product_name: string;
  consignment_value: number;
  available_quantity: number;
  item_ids: string[];
}

interface SellItem {
  product_id: string;
  quantity: number;
  sale_value: number;
  item_ids: string[];
}

interface SellModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ConsignmentItem[];
  commissionType: string;
  commissionValue: number;
  onConfirm: (data: { items: SellItem[]; observation: string }) => Promise<void>;
  isLoading?: boolean;
}

export function SellModal({
  open,
  onOpenChange,
  items,
  commissionType,
  commissionValue,
  onConfirm,
  isLoading = false,
}: SellModalProps) {
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [saleValues, setSaleValues] = useState<Record<string, number>>({});
  const [observation, setObservation] = useState("");

  // Group items by product_id (only items with_reseller status)
  const groupedProducts = useMemo(() => {
    const grouped = new Map<string, GroupedProduct>();

    items
      .filter((item) => item.status === "with_reseller")
      .forEach((item) => {
        const key = item.product_id;
        const existing = grouped.get(key);

        if (existing) {
          existing.available_quantity += 1;
          existing.item_ids.push(item.id);
        } else {
          grouped.set(key, {
            product_id: item.product_id,
            product_name: item.product?.name || "Produto não encontrado",
            consignment_value: Number(item.consignment_value),
            available_quantity: 1,
            item_ids: [item.id],
          });
        }
      });

    return Array.from(grouped.values());
  }, [items]);

  // Initialize sale values with consignment values
  useMemo(() => {
    const initialValues: Record<string, number> = {};
    groupedProducts.forEach((p) => {
      if (!(p.product_id in saleValues)) {
        initialValues[p.product_id] = p.consignment_value;
      }
    });
    if (Object.keys(initialValues).length > 0) {
      setSaleValues((prev) => ({ ...prev, ...initialValues }));
    }
  }, [groupedProducts]);

  const updateQuantity = (productId: string, delta: number) => {
    const product = groupedProducts.find((p) => p.product_id === productId);
    if (!product) return;

    const current = selectedQuantities[productId] || 0;
    const newValue = Math.max(0, Math.min(product.available_quantity, current + delta));

    setSelectedQuantities((prev) => ({
      ...prev,
      [productId]: newValue,
    }));
  };

  const updateSaleValue = (productId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSaleValues((prev) => ({
      ...prev,
      [productId]: numValue,
    }));
  };

  // Calculate totals
  const { totalItems, totalSaleValue, totalCommission, netProfit } = useMemo(() => {
    let items = 0;
    let saleTotal = 0;
    let commission = 0;

    groupedProducts.forEach((product) => {
      const qty = selectedQuantities[product.product_id] || 0;
      const saleValue = saleValues[product.product_id] || product.consignment_value;
      const lineTotal = qty * saleValue;

      items += qty;
      saleTotal += lineTotal;

      if (commissionType === "percent") {
        commission += lineTotal * (commissionValue / 100);
      } else {
        commission += qty * commissionValue;
      }
    });

    return {
      totalItems: items,
      totalSaleValue: saleTotal,
      totalCommission: commission,
      netProfit: saleTotal - commission,
    };
  }, [groupedProducts, selectedQuantities, saleValues, commissionType, commissionValue]);

  const handleConfirm = async () => {
    const sellItems: SellItem[] = groupedProducts
      .filter((p) => (selectedQuantities[p.product_id] || 0) > 0)
      .map((p) => ({
        product_id: p.product_id,
        quantity: selectedQuantities[p.product_id],
        sale_value: saleValues[p.product_id] || p.consignment_value,
        item_ids: p.item_ids.slice(0, selectedQuantities[p.product_id]),
      }));

    if (sellItems.length === 0) return;

    await onConfirm({ items: sellItems, observation });
    setSelectedQuantities({});
    setObservation("");
    onOpenChange(false);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setSelectedQuantities({});
      setObservation("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Registrar Vendas
          </DialogTitle>
          <DialogDescription>
            Selecione os produtos vendidos e informe o valor de venda real.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {groupedProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum produto disponível para venda.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="max-h-[280px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-center">Disp.</TableHead>
                      <TableHead className="text-center">Qtd.</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedProducts.map((product) => {
                      const qty = selectedQuantities[product.product_id] || 0;
                      const saleValue = saleValues[product.product_id] || product.consignment_value;
                      const subtotal = qty * saleValue;

                      return (
                        <TableRow key={product.product_id} className="border-border">
                          <TableCell className="font-medium">
                            {product.product_name}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {product.available_quantity}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(product.product_id, -1)}
                                disabled={qty === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{qty}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(product.product_id, 1)}
                                disabled={qty >= product.available_quantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={saleValue}
                              onChange={(e) => updateSaleValue(product.product_id, e.target.value)}
                              className="w-24 text-right h-8 ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right text-primary font-medium">
                            R$ {subtotal.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Commission Info */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Total Vendas</p>
              <p className="text-lg font-bold text-foreground">
                R$ {totalSaleValue.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Comissão ({commissionType === "percent" ? `${commissionValue}%` : `R$ ${commissionValue}/un.`})
              </p>
              <p className="text-lg font-bold text-red-400">
                - R$ {totalCommission.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
              <p className="text-lg font-bold text-primary">
                R$ {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observation">Observação (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Detalhes da venda..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              Total: <strong className="text-foreground">{totalItems} peça(s)</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={totalItems === 0 || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Confirmar Vendas
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
