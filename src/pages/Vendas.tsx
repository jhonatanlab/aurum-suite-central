import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Package,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  category: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function Vendas() {
  const { company } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-pdv", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, stock, category")
        .eq("company_id", company.id)
        .eq("status", "active")
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!company?.id,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (product.stock !== null && existing.quantity >= product.stock) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (item.product.stock !== null && newQty > item.product.stock) {
              toast.error("Estoque insuficiente");
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    toast.success("Função de finalizar venda será implementada");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <AppLayout title="Vendas">
      <div className="flex h-[calc(100vh-120px)] gap-6">
        {/* Products Grid */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary border-border focus:border-primary"
              />
            </div>
          </div>

          {/* Products */}
          <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Package className="h-12 w-12 mb-4 opacity-50" />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="bg-card border-border card-hover group"
                  >
                    <CardContent className="p-4 flex flex-col h-full">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-primary font-bold text-lg mb-2">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Estoque: {product.stock ?? 0}
                        </p>
                      </div>
                      <Button
                        onClick={() => addToCart(product)}
                        className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                        disabled={product.stock !== null && product.stock <= 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-[380px] flex-shrink-0 bg-secondary rounded-2xl border border-border flex flex-col">
          {/* Cart Header */}
          <div className="p-5 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg">Carrinho</h2>
                <p className="text-sm text-muted-foreground">
                  {cart.length} {cart.length === 1 ? "item" : "itens"}
                </p>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-card rounded-xl p-4 border border-border"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 mr-2">
                      <h4 className="font-medium text-foreground text-sm line-clamp-1">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.product.price)} un.
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-destructive hover:text-destructive/80 transition-colors p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border"
                        onClick={() => updateQuantity(item.product.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 border-border"
                        onClick={() => updateQuantity(item.product.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-semibold text-primary">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cart Footer */}
          <div className="p-5 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(cartTotal)}
                </span>
              </div>
            </div>
            <Button
              onClick={handleFinalizeSale}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base"
              disabled={cart.length === 0}
            >
              Finalizar Venda
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
