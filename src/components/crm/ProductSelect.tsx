import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package } from "lucide-react";
import { useProducts, Product } from "@/hooks/useProducts";

interface ProductSelectProps {
  productId: string | null;
  productValue: number | null;
  onProductChange: (productId: string | null, productValue: number | null) => void;
}

export function ProductSelect({ productId, productValue, onProductChange }: ProductSelectProps) {
  const { products, isLoading } = useProducts();
  const [localValue, setLocalValue] = useState<string>("");

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(productValue !== null ? productValue.toString() : "");
  }, [productValue]);

  const handleProductSelect = (selectedId: string) => {
    if (selectedId === "none") {
      onProductChange(null, null);
      setLocalValue("");
      return;
    }

    const product = products.find((p) => p.id === selectedId);
    if (product) {
      onProductChange(product.id, product.price);
      setLocalValue(product.price.toString());
    }
  };

  const handleValueChange = (value: string) => {
    setLocalValue(value);
    const numValue = parseFloat(value) || null;
    onProductChange(productId, numValue);
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Package className="h-4 w-4" />
        <span>Produto de Interesse</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product">Produto</Label>
          <Select value={productId || "none"} onValueChange={handleProductSelect}>
            <SelectTrigger className="bg-background border-border/50">
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="none">Nenhum produto</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center justify-between gap-4">
                    <span>{product.name}</span>
                    <span className="text-muted-foreground text-xs">
                      R$ {product.price.toLocaleString("pt-BR")}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="productValue">Valor do Produto (R$)</Label>
          <Input
            id="productValue"
            type="number"
            step="0.01"
            min="0"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="0,00"
            disabled={!productId}
            className="bg-background border-border/50 focus:border-primary"
          />
          {selectedProduct && productValue !== selectedProduct.price && productValue !== null && (
            <p className="text-xs text-muted-foreground">
              Valor original: R$ {selectedProduct.price.toLocaleString("pt-BR")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
