import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts } from "@/hooks/useProducts";
import { useConsignment, AddBatchItem } from "@/hooks/useConsignment";
import { Search, Package, Loader2, Plus, Minus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface AddBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resellerId: string;
}

interface SelectedProduct {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
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

  const addProduct = (product: { id: string; name: string; price: number; stock: number | null }) => {
    if (isSelected(product.id)) return;
    
    setSelectedProducts((prev) => [
      ...prev,
      {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock ?? 0,
      },
    ]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (p.product_id === productId) {
          const maxQty = p.stock;
          return { ...p, quantity: Math.min(quantity, maxQty) };
        }
        return p;
      })
    );
  };

  const getSubtotal = (product: SelectedProduct) => {
    return product.price * product.quantity;
  };

  const totalLote = useMemo(() => {
    return selectedProducts.reduce((acc, p) => acc + getSubtotal(p), 0);
  }, [selectedProducts]);

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) return;
    
    // Validate all quantities
    const hasInvalidQty = selectedProducts.some((p) => p.quantity < 1);
    if (hasInvalidQty) return;

    const items: AddBatchItem[] = selectedProducts.map((p) => ({
      product_id: p.product_id,
      consignment_value: p.price,
      quantity: p.quantity,
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
      <DialogContent 
        className="max-w-[800px] w-[95vw] max-h-[85vh] flex flex-col bg-card border-border p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-xl font-semibold">
            Adicionar Lote de Consignação
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Date and Observation - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sent_at" className="text-sm">Data de Envio</Label>
              <Input
                id="sent_at"
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="bg-background border-border h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="observation" className="text-sm">Observação (opcional)</Label>
              <Input
                id="observation"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Ex: Lote para evento X"
                className="bg-background border-border h-9"
              />
            </div>
          </div>

          {/* Section 1: Product Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selecionar Produtos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border h-9"
              />
            </div>

            <ScrollArea className="h-40 rounded-lg border border-border bg-background">
              {loadingProducts ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Package className="h-6 w-6 mb-1 opacity-50" />
                  <p className="text-xs">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="p-1.5 space-y-0.5">
                  {filteredProducts.map((product) => {
                    const alreadySelected = isSelected(product.id);
                    const outOfStock = (product.stock ?? 0) <= 0;
                    
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                          alreadySelected
                            ? "bg-primary/10 border border-primary/30"
                            : outOfStock
                            ? "opacity-50"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {product.category && <span>{product.category}</span>}
                            <span>•</span>
                            <span>Estoque: {product.stock ?? 0}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <p className="text-sm text-primary font-medium">
                            R$ {product.price.toFixed(2)}
                          </p>
                          <Button
                            size="sm"
                            variant={alreadySelected ? "secondary" : "default"}
                            disabled={alreadySelected || outOfStock}
                            onClick={() => addProduct(product)}
                            className="h-7 px-2 text-xs"
                          >
                            {alreadySelected ? "Adicionado" : outOfStock ? "Sem estoque" : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Adicionar
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Section 2: Added Products - Fixed height with scroll */}
          {selectedProducts.length > 0 && (
            <div className="space-y-2 flex flex-col">
              <Label className="text-sm font-medium shrink-0">
                Produtos no Lote ({selectedProducts.length})
              </Label>
              
              <div className="rounded-lg border border-border bg-background overflow-hidden flex flex-col">
                {/* Table Header - Fixed */}
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground shrink-0">
                  <div className="col-span-4">Produto</div>
                  <div className="col-span-2 text-right">Preço Unit.</div>
                  <div className="col-span-3 text-center">Quantidade</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                  <div className="col-span-1"></div>
                </div>
                
                {/* Table Body - Scrollable */}
                <div className="max-h-[180px] overflow-y-auto">
                  <div className="divide-y divide-border">
                    {selectedProducts.map((product) => (
                      <div
                        key={product.product_id}
                        className="grid grid-cols-12 gap-2 px-3 py-2 items-center"
                      >
                        <div className="col-span-4 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Disponível: {product.stock}
                          </p>
                        </div>
                        <div className="col-span-2 text-right text-sm text-muted-foreground">
                          R$ {product.price.toFixed(2)}
                        </div>
                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(product.product_id, product.quantity - 1)}
                            disabled={product.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            max={product.stock}
                            value={product.quantity}
                            onChange={(e) =>
                              updateQuantity(product.product_id, parseInt(e.target.value) || 1)
                            }
                            className="w-14 h-7 text-center text-sm bg-background border-border px-1"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(product.product_id, product.quantity + 1)}
                            disabled={product.quantity >= product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="col-span-2 text-right font-medium text-sm text-primary">
                          R$ {getSubtotal(product).toFixed(2)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => removeProduct(product.product_id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total - Fixed at bottom of section */}
              <div className="flex justify-between items-center px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 shrink-0">
                <span className="text-sm font-medium">Total do Lote:</span>
                <span className="text-lg font-bold text-primary">
                  R$ {totalLote.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2 bg-card">
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
              "Adicionar ao Lote"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
