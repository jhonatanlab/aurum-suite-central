import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";

interface SimpleProductSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function SimpleProductSelect({
  value,
  onValueChange,
  placeholder = "Selecione um produto",
}: SimpleProductSelectProps) {
  const { products, isLoading } = useProducts();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="bg-card border-border">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <SelectItem value="loading" disabled>
            Carregando...
          </SelectItem>
        ) : products.length === 0 ? (
          <SelectItem value="empty" disabled>
            Nenhum produto cadastrado
          </SelectItem>
        ) : (
          products.map((product) => (
            <SelectItem key={product.id} value={product.id}>
              <div className="flex items-center gap-2">
                <span>{product.name}</span>
                {product.category && (
                  <span className="text-xs text-muted-foreground">
                    ({product.category})
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
