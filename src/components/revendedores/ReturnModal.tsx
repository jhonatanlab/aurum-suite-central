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
import { Minus, Plus, Undo2, Loader2 } from "lucide-react";
import { ConsignmentItem } from "@/hooks/useConsignment";

interface GroupedProduct {
  product_id: string;
  product_name: string;
  consignment_value: number;
  available_quantity: number;
  item_ids: string[];
}

interface ReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ConsignmentItem[];
  onConfirm: (data: { items: Array<{ product_id: string; quantity: number; item_ids: string[] }>; observation: string }) => Promise<void>;
  isLoading?: boolean;
}

export function ReturnModal({
  open,
  onOpenChange,
  items,
  onConfirm,
  isLoading = false,
}: ReturnModalProps) {
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
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

  const totalItems = Object.values(selectedQuantities).reduce((acc, qty) => acc + qty, 0);

  const handleConfirm = async () => {
    const returnItems = groupedProducts
      .filter((p) => (selectedQuantities[p.product_id] || 0) > 0)
      .map((p) => ({
        product_id: p.product_id,
        quantity: selectedQuantities[p.product_id],
        item_ids: p.item_ids.slice(0, selectedQuantities[p.product_id]),
      }));

    if (returnItems.length === 0) return;

    await onConfirm({ items: returnItems, observation });
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
      <DialogContent className="max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-primary" />
            Retorno de Consignação
          </DialogTitle>
          <DialogDescription>
            Selecione os produtos e quantidades a serem devolvidos ao estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {groupedProducts.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum produto disponível para devolução.
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Disponível</TableHead>
                    <TableHead className="text-center">Devolver</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedProducts.map((product) => (
                    <TableRow key={product.product_id} className="border-border">
                      <TableCell className="font-medium">
                        {product.product_name}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.available_quantity} un.
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.product_id, -1)}
                            disabled={(selectedQuantities[product.product_id] || 0) === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">
                            {selectedQuantities[product.product_id] || 0}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(product.product_id, 1)}
                            disabled={
                              (selectedQuantities[product.product_id] || 0) >=
                              product.available_quantity
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observation">Observação (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Motivo da devolução..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              Total a devolver: <strong className="text-foreground">{totalItems} peça(s)</strong>
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
                    <Undo2 className="h-4 w-4 mr-2" />
                    Confirmar Devolução
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
