import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/hooks/useAuth";
import { useSalesColumnV2 } from "@/hooks/useSalesColumnV2";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, ShoppingCart, Plus, Minus, Trash2, Package, DollarSign, User, Percent, History, Truck, AlertCircle, X, Layers, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SalesHistoryTab } from "@/components/vendas/SalesHistoryTab";
import { MultiPaymentManager, PaymentEntry } from "@/components/vendas/MultiPaymentManager";
import { ClientSelect } from "@/components/vendas/ClientSelect";
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number | null;
  category: string | null;
  type: string;
}
interface CartItem {
  product: Product;
  quantity: number;
}
interface SaleCost {
  type: string;
  description: string;
  amount: number;
}
export default function Vendas() {
  const {
    company
  } = useCompany();
  const {
    user
  } = useAuth();
  const {
    moveLeadToSales,
    isAutoMoveEnabled
  } = useSalesColumnV2();
  const isMobile = useIsMobile();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountValue, setDiscountValue] = useState<string>("");

  // New state for enhanced PDV
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [totalPaid, setTotalPaid] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [saleCosts, setSaleCosts] = useState<SaleCost[]>([]);
  const [interestToCustomer, setInterestToCustomer] = useState(0);
  const [clientFreight, setClientFreight] = useState<string>("");
  const [storeFreight, setStoreFreight] = useState<string>("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const {
    data: products,
    isLoading
  } = useQuery({
    queryKey: ["products-pdv", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const {
        data: productsData,
        error: productsError
      } = await supabase.from("products").select("id, name, price, stock, category, type").eq("company_id", company.id).eq("status", "active").order("name");
      if (productsError) throw productsError;

      // Calculate stock from batches for simple products
      const {
        data: batchesData,
        error: batchesError
      } = await supabase.from("product_batches").select("product_id, quantity").eq("company_id", company.id).eq("status", "active");
      if (batchesError) throw batchesError;

      const stockByProduct = batchesData?.reduce((acc, batch) => {
        acc[batch.product_id] = (acc[batch.product_id] || 0) + batch.quantity;
        return acc;
      }, {} as Record<string, number>) || {};

      // For bundles, get max stock via RPC
      const bundleProducts = productsData.filter(p => p.type === "bundle");
      const bundleStocks: Record<string, number> = {};
      for (const bp of bundleProducts) {
        const { data: maxStock } = await supabase.rpc("get_bundle_max_stock", { bundle_uuid: bp.id });
        bundleStocks[bp.id] = maxStock ?? 0;
      }

      return productsData.map(product => ({
        ...product,
        stock: product.type === "bundle"
          ? bundleStocks[product.id] ?? 0
          : stockByProduct[product.id] ?? 0,
      })) as Product[];
    },
    enabled: !!company?.id
  });
  const {
    data: leads
  } = useQuery({
    queryKey: ["leads-pdv", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const {
        data,
        error
      } = await supabase.from("leads").select("id, name").eq("company_id", company.id).order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!company?.id
  });
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (product.stock !== null && existing.quantity >= product.stock) {
          toast.error("Estoque insuficiente");
          return prev;
        }
        return prev.map(item => item.product.id === product.id ? {
          ...item,
          quantity: item.quantity + 1
        } : item);
      }
      return [...prev, {
        product,
        quantity: 1
      }];
    });
  };
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (item.product.stock !== null && newQty > item.product.stock) {
            toast.error("Estoque insuficiente");
            return item;
          }
          return {
            ...item,
            quantity: newQty
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };
  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cart]);
  const calculatedDiscount = useMemo(() => {
    const percentVal = parseFloat(discountPercent) || 0;
    const valueVal = parseFloat(discountValue) || 0;
    if (percentVal > 0) {
      return Math.round(cartSubtotal * percentVal / 100 * 100) / 100;
    }
    return valueVal;
  }, [cartSubtotal, discountPercent, discountValue]);
  const clientFreightValue = parseFloat(clientFreight) || 0;
  const storeFreightValue = parseFloat(storeFreight) || 0;

  // Total includes: subtotal - discount + client freight + interest passed to customer
  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - calculatedDiscount + clientFreightValue + interestToCustomer);
  }, [cartSubtotal, calculatedDiscount, clientFreightValue, interestToCustomer]);

  // All costs including store freight
  const allCosts = useMemo(() => {
    const costs = [...saleCosts];
    if (storeFreightValue > 0) {
      costs.push({
        type: "store_freight",
        description: "Frete pago pela loja",
        amount: storeFreightValue
      });
    }
    return costs;
  }, [saleCosts, storeFreightValue]);
  const handleDiscountPercentChange = (value: string) => {
    setDiscountPercent(value);
    if (value && cartSubtotal > 0) {
      const percent = parseFloat(value) || 0;
      const calculated = Math.round(cartSubtotal * percent / 100 * 100) / 100;
      setDiscountValue(calculated.toFixed(2));
    } else {
      setDiscountValue("");
    }
  };
  const handleDiscountValueChange = (value: string) => {
    setDiscountValue(value);
    if (value && cartSubtotal > 0) {
      const val = parseFloat(value) || 0;
      const percent = val / cartSubtotal * 100;
      setDiscountPercent(percent.toFixed(2));
    } else {
      setDiscountPercent("");
    }
  };
  const handlePaymentsChange = (newPayments: PaymentEntry[]) => {
    setPayments(newPayments);
  };
  const handleTotalPaidChange = (paid: number, pending: number) => {
    setTotalPaid(paid);
    setPendingBalance(pending);
  };
  const handleCostsChange = (costs: SaleCost[]) => {
    setSaleCosts(costs);
  };
  const handleInterestToCustomer = (amount: number) => {
    setInterestToCustomer(amount);
  };
  const finalizeSaleMutation = useMutation({
    mutationFn: async () => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (payments.length === 0) throw new Error("Adicione pelo menos um pagamento");
      const selectedLead = selectedClientId && selectedClientId !== "none" ? leads?.find(l => l.id === selectedClientId) : null;
      const actualPendingBalance = Math.max(0, cartTotal - totalPaid);
      const saleStatus = actualPendingBalance > 0 ? "pending" : "completed";

      // Create sale record
      const {
        data: sale,
        error: saleError
      } = await supabase.from("sales").insert({
        company_id: company.id,
        created_at: saleDate.toISOString(),
        client_id: selectedClientId && selectedClientId !== "none" ? selectedClientId : null,
        payment_method: payments.length > 1 ? "multiplo" : payments[0]?.method || "outros",
        discount_value: calculatedDiscount,
        subtotal: cartSubtotal,
        client_freight: clientFreightValue,
        store_freight: storeFreightValue,
        total: cartTotal,
        total_paid: totalPaid,
        pending_balance: actualPendingBalance,
        sale_costs: allCosts as any,
        seller_id: user?.id || null,
        status: saleStatus
      }).select("id").single();
      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: Number(item.product.price)
      }));
      const {
        error: itemsError
      } = await supabase.from("sale_items").insert(saleItems);
      if (itemsError) {
        await supabase.from("sales").delete().eq("id", sale.id).eq("company_id", company.id);
        throw itemsError;
      }

      // Create sale payments
      const salePayments = payments.map(p => ({
        sale_id: sale.id,
        payment_method: p.method,
        amount: p.amount,
        installments: p.installments,
        gateway_id: p.gatewayId,
        interest_rate_percent: p.interestRatePercent,
        interest_amount: p.interestAmount,
        gateway_fee_percent: p.gatewayFeePercent,
        gateway_fee_amount: p.gatewayFeeAmount
      }));
      const {
        error: paymentsError
      } = await supabase.from("sale_payments").insert(salePayments);
      if (paymentsError) {
        console.error("Error creating sale payments:", paymentsError);
      }

      // Update product stock
      for (const item of cart) {
        if (item.product.type === "bundle") {
          // Use sell_bundle RPC for bundles (reduces component stock atomically)
          const { error: bundleError } = await supabase.rpc("sell_bundle", {
            bundle_uuid: item.product.id,
            qty: item.quantity,
          });
          if (bundleError) throw new Error(`Erro ao vender kit "${item.product.name}": ${bundleError.message}`);
        } else {
          // For simple products, reduce stock in product_batches and products table
          const newStock = Math.max(0, (item.product.stock ?? 0) - item.quantity);
          await supabase.from("products").update({
            stock: newStock
          }).eq("id", item.product.id);
        }
      }

      // Create financial transaction for pending balance (accounts receivable)
      if (actualPendingBalance > 0) {
        const {
          error: financialError
        } = await supabase.from("financial_transactions").insert({
          company_id: company.id,
          type: "income",
          description: `Conta a receber - Venda #${sale.id.slice(0, 8)}`,
          value: actualPendingBalance,
          date: format(saleDate, "yyyy-MM-dd"),
          status: "pending",
          origin: "sale",
          method: null
        });
        if (financialError) {
          console.error("Error creating accounts receivable:", financialError);
        }
      }

      // CRM Integration
      if (selectedLead && isAutoMoveEnabled) {
        try {
          const {
            data: leadData
          } = await supabase.from("leads").select("history, product_id").eq("id", selectedLead.id).single();
          let productName: string | undefined;
          if (cart.length === 1) {
            productName = cart[0].product.name;
          } else if (cart.length > 1) {
            productName = `${cart.length} produtos`;
          }
          await supabase.from("leads").update({
            product_value: cartTotal
          }).eq("id", selectedLead.id);
          await moveLeadToSales.mutateAsync({
            leadId: selectedLead.id,
            productName,
            saleTotal: cartTotal,
            currentHistory: leadData?.history as any[] || [],
            userEmail: user?.email || "Sistema"
          });
        } catch (crmError) {
          console.error("Erro ao integrar com CRM:", crmError);
        }
      }
      return sale;
    },
    onSuccess: () => {
      const hasPending = Math.max(0, cartTotal - totalPaid) > 0;
      toast.success(hasPending ? "Venda registrada com saldo pendente!" : "Venda registrada com sucesso!");
      // Reset everything
      setCart([]);
      setSelectedClientId("");
      setDiscountPercent("");
      setDiscountValue("");
      setPayments([]);
      setTotalPaid(0);
      setPendingBalance(0);
      setSaleCosts([]);
      setInterestToCustomer(0);
      setClientFreight("");
      setStoreFreight("");
      setSaleDate(new Date());
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: ["products-pdv"]
      });
      queryClient.invalidateQueries({
        queryKey: ["leads"]
      });
      queryClient.invalidateQueries({
        queryKey: ["sales-history"]
      });
      queryClient.invalidateQueries({
        queryKey: ["financial-transactions"]
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao finalizar venda");
    }
  });
  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast.error("Carrinho vazio");
      return;
    }
    if (payments.length === 0) {
      toast.error("Adicione pelo menos um pagamento");
      return;
    }
    finalizeSaleMutation.mutate();
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };
  const totalCostsAmount = allCosts.reduce((sum, c) => sum + c.amount, 0);
  return <AppLayout title="Vendas">
      <Tabs defaultValue="pdv" className="w-full">
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="pdv" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShoppingCart className="h-4 w-4 mr-2" />
            PDV
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="h-4 w-4 mr-2" />
            Histórico de Vendas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdv" className="mt-0">
          {/* Products Grid - full width, with padding for fixed cart on desktop */}
          <div className={`flex flex-col min-w-0 ${!isMobile ? 'pr-[420px]' : ''}`}>
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar produto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-secondary border-border focus:border-primary" />
              </div>
            </div>

            {/* Products */}
            <div className="flex-1 overflow-y-auto pr-2">
              {isLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({
                length: 8
              }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
                </div> : filteredProducts.length === 0 ? <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Package className="h-12 w-12 mb-4 opacity-50" />
                  <p>Nenhum produto encontrado</p>
                </div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => <Card key={product.id} className="bg-card border-border card-hover group">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground line-clamp-2">
                              {product.name}
                            </h3>
                            {product.type === "bundle" && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/20 text-primary shrink-0">
                                <Layers className="h-2.5 w-2.5" /> Kit
                              </span>
                            )}
                          </div>
                          <p className="text-primary font-bold text-lg mb-2">
                            {formatCurrency(product.price)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Estoque: {product.stock ?? 0}
                          </p>
                        </div>
                        <Button onClick={() => addToCart(product)} className="mt-4 w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={product.stock !== null && product.stock <= 0}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar
                        </Button>
                      </CardContent>
                    </Card>)}
                </div>}
            </div>
          </div>

          {/* Mobile: Floating cart button */}
          {isMobile && <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40" size="icon">
                  <ShoppingCart className="h-6 w-6" />
                  {cart.length > 0 && <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                      {cart.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col bg-secondary">
                <SheetHeader className="p-5 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <SheetTitle className="font-bold text-foreground text-lg">Carrinho</SheetTitle>
                      <p className="text-sm text-muted-foreground">
                        {cart.length} {cart.length === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </div>
                </SheetHeader>

                {/* Cart Content for Mobile */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                      <p className="text-sm">Carrinho vazio</p>
                    </div> : cart.map(item => <div key={item.product.id} className="bg-card rounded-xl p-4 border border-border">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0 mr-2">
                          <h4 className="font-medium text-foreground text-sm line-clamp-1">
                            {item.product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.product.price)} un.
                          </p>
                        </div>
                        <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/80 transition-colors p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={() => updateQuantity(item.product.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={() => updateQuantity(item.product.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-semibold text-primary">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>)}
                </div>

                {/* Cart Footer for Mobile */}
                <div className="p-5 border-t border-border space-y-4 max-h-[60vh] overflow-y-auto">
                   {/* Cliente Select */}
                   <ClientSelect value={selectedClientId} onChange={setSelectedClientId} />

                   {/* Sale Date */}
                   <div className="space-y-2">
                     <Label className="text-sm text-muted-foreground flex items-center gap-1">
                       <CalendarIcon className="h-3 w-3" />
                       Data da Venda
                     </Label>
                     <Popover>
                       <PopoverTrigger asChild>
                         <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-card border-border", !saleDate && "text-muted-foreground")}>
                           <CalendarIcon className="mr-2 h-4 w-4" />
                           {saleDate ? format(saleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                       </PopoverContent>
                     </Popover>
                   </div>

                  {/* Discount Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Desconto (%)
                      </Label>
                      <Input type="number" min="0" max="100" step="0.01" placeholder="0" value={discountPercent} onChange={e => handleDiscountPercentChange(e.target.value)} className="bg-card border-border focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Desconto (R$)
                      </Label>
                      <Input type="number" min="0" step="0.01" placeholder="0,00" value={discountValue} onChange={e => handleDiscountValueChange(e.target.value)} className="bg-card border-border focus:border-primary" />
                    </div>
                  </div>

                  {/* Freight Fields */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        Frete Cliente
                      </Label>
                      <Input type="number" min="0" step="0.01" placeholder="0,00" value={clientFreight} onChange={e => setClientFreight(e.target.value)} className="bg-card border-border focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3 text-destructive" />
                        Frete Loja
                      </Label>
                      <Input type="number" min="0" step="0.01" placeholder="0,00" value={storeFreight} onChange={e => setStoreFreight(e.target.value)} className="bg-card border-border focus:border-primary" />
                    </div>
                  </div>

                  {/* Multi Payment Manager */}
                  <MultiPaymentManager totalDue={cartTotal} onPaymentsChange={handlePaymentsChange} onTotalPaidChange={handleTotalPaidChange} onCostsChange={handleCostsChange} onInterestToCustomer={handleInterestToCustomer} />

                  {/* Totals */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">{formatCurrency(cartSubtotal)}</span>
                    </div>
                    {calculatedDiscount > 0 && <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Desconto</span>
                        <span className="text-destructive">-{formatCurrency(calculatedDiscount)}</span>
                      </div>}
                    {clientFreightValue > 0 && <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Frete (cliente)</span>
                        <span className="text-foreground">+{formatCurrency(clientFreightValue)}</span>
                      </div>}
                    {interestToCustomer > 0 && <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Juros</span>
                        <span className="text-foreground">+{formatCurrency(interestToCustomer)}</span>
                      </div>}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-muted-foreground font-medium">Total</span>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        <span className="text-2xl font-bold text-foreground">
                          {formatCurrency(cartTotal)}
                        </span>
                      </div>
                    </div>
                    {pendingBalance > 0 && payments.length > 0 && <div className="flex items-center justify-between text-sm bg-amber-500/10 rounded-lg p-2">
                        <span className="text-amber-500 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Saldo Pendente
                        </span>
                        <span className="text-amber-500 font-semibold">{formatCurrency(pendingBalance)}</span>
                      </div>}
                    {totalCostsAmount > 0 && <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Custos da venda</span>
                        <span className="text-destructive">{formatCurrency(totalCostsAmount)}</span>
                      </div>}
                  </div>

                  <Button onClick={handleFinalizeSale} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base" disabled={cart.length === 0 || payments.length === 0 || finalizeSaleMutation.isPending}>
                    {finalizeSaleMutation.isPending ? "Processando..." : "Finalizar Venda"}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>}

          {/* Desktop: Fixed Cart Panel */}
          {!isMobile && <div className="fixed top-0 right-0 w-[400px] h-screen bg-secondary border-l border-border flex flex-col shadow-2xl z-30">
              {/* Cart Header - Compact */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">Carrinho</span>
                <span className="text-xs text-muted-foreground">
                  ({cart.length} {cart.length === 1 ? "item" : "itens"})
                </span>
              </div>

              {/* Cart Items - Limited height */}
              <div className="overflow-y-auto p-3 space-y-2 max-h-[30vh]">
                {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Carrinho vazio</p>
                  </div> : cart.map(item => <div key={item.product.id} className="bg-card rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0 mr-2">
                        <h4 className="font-medium text-foreground text-sm line-clamp-1">
                          {item.product.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.product.price)} un.
                        </p>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-destructive hover:text-destructive/80 transition-colors p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={() => updateQuantity(item.product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium text-foreground">
                          {item.quantity}
                        </span>
                        <Button variant="outline" size="icon" className="h-8 w-8 border-border" onClick={() => updateQuantity(item.product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-semibold text-primary">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>)}
              </div>

              {/* Cart Options - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 border-t border-border space-y-3">
                {/* Cliente Select */}
                <ClientSelect value={selectedClientId} onChange={setSelectedClientId} />

                {/* Sale Date */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    Data da Venda
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-card border-border", !saleDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {saleDate ? format(saleDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={saleDate} onSelect={(d) => d && setSaleDate(d)} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Discount Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Percent className="h-3 w-3" />
                      Desconto (%)
                    </Label>
                    <Input type="number" min="0" max="100" step="0.01" placeholder="0" value={discountPercent} onChange={e => handleDiscountPercentChange(e.target.value)} className="bg-card border-border focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Desconto (R$)
                    </Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" value={discountValue} onChange={e => handleDiscountValueChange(e.target.value)} className="bg-card border-border focus:border-primary" />
                  </div>
                </div>

                {/* Freight Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Frete Cliente
                    </Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" value={clientFreight} onChange={e => setClientFreight(e.target.value)} className="bg-card border-border focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3 text-destructive" />
                      Frete Loja
                    </Label>
                    <Input type="number" min="0" step="0.01" placeholder="0,00" value={storeFreight} onChange={e => setStoreFreight(e.target.value)} className="bg-card border-border focus:border-primary" />
                  </div>
                </div>

                {/* Multi Payment Manager */}
                <MultiPaymentManager totalDue={cartTotal} onPaymentsChange={handlePaymentsChange} onTotalPaidChange={handleTotalPaidChange} onCostsChange={handleCostsChange} onInterestToCustomer={handleInterestToCustomer} />
              </div>

              {/* Cart Footer - Fixed at bottom */}
              <div className="shrink-0 p-4 border-t border-border bg-secondary space-y-3">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {calculatedDiscount > 0 && <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Desconto</span>
                      <span className="text-destructive">-{formatCurrency(calculatedDiscount)}</span>
                    </div>}
                  {clientFreightValue > 0 && <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frete (cliente)</span>
                      <span className="text-foreground">+{formatCurrency(clientFreightValue)}</span>
                    </div>}
                  {interestToCustomer > 0 && <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Juros</span>
                      <span className="text-foreground">+{formatCurrency(interestToCustomer)}</span>
                    </div>}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold text-foreground">
                        {formatCurrency(cartTotal)}
                      </span>
                    </div>
                  </div>
                  {pendingBalance > 0 && payments.length > 0 && <div className="flex items-center justify-between text-sm bg-amber-500/10 rounded-lg p-2">
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        Saldo Pendente
                      </span>
                      <span className="text-amber-500 font-semibold">{formatCurrency(pendingBalance)}</span>
                    </div>}
                  {totalCostsAmount > 0 && <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Custos da venda</span>
                      <span className="text-destructive">{formatCurrency(totalCostsAmount)}</span>
                    </div>}
                </div>

                <Button onClick={handleFinalizeSale} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base" disabled={cart.length === 0 || payments.length === 0 || finalizeSaleMutation.isPending}>
                  {finalizeSaleMutation.isPending ? "Processando..." : "Finalizar Venda"}
                </Button>
              </div>
            </div>}
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <SalesHistoryTab />
        </TabsContent>
      </Tabs>
    </AppLayout>;
}