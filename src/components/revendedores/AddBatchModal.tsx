import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts } from "@/hooks/useProducts";
import { useConsignment, AddBatchItem } from "@/hooks/useConsignment";
import { Search, Package, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AddBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellerId: string;
}

interface SelectedProduct {
  product_id: string;
  name: string;
  originalPrice: number;
  consignment_value: number;
}

export function AddBatchModal({ open, onOpenChange, resellerId }: AddBatchModalProps) {
  const { products, isLoading: loadingProducts } = useProducts();
  const { addBatch } = useConsignment(resellerId);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [sentAt, setSentAt] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observation, setObservation] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const isSelected = (productId: string) => {
    return selectedProducts.some((p) => p.product_id === productId);
  };

  const toggleProduct = (product: { id: string; name: string; price: number }) => {
    if (isSelected(product.id)) {
      setSelectedProducts((prev) => prev.filter((p) => p.product_id !== product.id));
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          originalPrice: product.price,
          consignment_value: product.price,
        },
      ]);
    }
  };

  const updateConsignmentValue = (productId: string, value: number) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.product_id === productId ? { ...p, consignment_value: value } : p
      )
    );
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) return;

    const items: AddBatchItem[] = selectedProducts.map((p) => ({
      product_id: p.product_id,
      consignment_value: p.consignment_value,
    }));

    await addBatch.mutateAsync({
      reseller_id: resellerId,
      sent_at: sentAt,
      observation,
      items,
    });

    // Reset form
    setSelectedProducts([]);
    setSearchQuery("");
    setObservation("");
    setSentAt(format(new Date(), "yyyy-MM-dd"));
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedProducts([]);
    setSearchQuery("");
    setObservation("");
    setSentAt(format(new Date(), "yyyy-MM-dd"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Adicionar Lote de Consignação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date and Observation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sent_at">Data de Envio</Label>
              <Input
                id="sent_at"
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observation">Observação (opcional)</Label>
              <Textarea
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Lote para evento X"
                className="bg-background border-border resize-none h-10"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-3">
            <Label>Selecionar Produtos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>

            <ScrollArea className="h-48 rounded-lg border border-border bg-background">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected(product.id)
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleProduct(product)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected(product.id)}
                          onCheckedChange={() => toggleProduct(product)}
                        />
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          {product.category && (
                            <p className="text-xs text-muted-foreground">
                              {product.category}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-primary font-medium">
                        R$ {product.price.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Products with Editable Values */}
          {selectedProducts.length > 0 && (
            <div className="space-y-3">
              <Label>
                Produtos Selecionados ({selectedProducts.length})
              </Label>
              <ScrollArea className="max-h-40 rounded-lg border border-border bg-background">
                <div className="p-2 space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Preço original: R$ {product.originalPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">
                          Valor:
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={product.consignment_value}
                          onChange={(e) =>
                            updateConsignmentValue(
                              product.product_id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-28 h-8 bg-background border-border text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium">Total do Lote:</span>
                <span className="text-lg font-bold text-primary">
                  R${" "}
                  {selectedProducts
                    .reduce((acc, p) => acc + p.consignment_value, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedProducts.length === 0 || addBatch.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {addBatch.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              `Adicionar ${selectedProducts.length} Peça(s)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
