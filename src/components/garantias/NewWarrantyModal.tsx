import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useResellers } from "@/hooks/useResellers";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRight } from "lucide-react";

export interface WarrantySubmitData {
  product_id: string;
  customer_name?: string;
  reseller_id?: string;
  request_type: string;
  batch_code?: string;
  batch_date?: string;
  reason?: string;
  observation?: string;
  // New fields for type-specific logic
  payment_responsibility?: "client" | "company";
  exchange_product_id?: string;
  exchange_product_value?: number;
  original_product_value?: number;
  original_sale_id?: string;
}

interface NewWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: WarrantySubmitData) => void;
  isLoading: boolean;
}

const REQUEST_TYPES = [
  { value: "exchange", label: "Troca Simples" },
  { value: "herd", label: "Rebanho" },
  { value: "exchange_with_sale", label: "Troca com Venda" },
  { value: "repair", label: "Conserto" },
  { value: "total_loss", label: "Perda Total" },
];

interface CustomerWithSales {
  id: string;
  name: string;
  client_id: string | null;
}

interface ProductPurchased {
  product_id: string;
  product_name: string;
  sale_id: string;
  is_bundle: boolean;
  price: number;
}

interface ProductBatchInfo {
  batch_code: string | null;
  batch_date: string | null;
}

type ClientType = "customer" | "reseller" | "unregistered";

export function NewWarrantyModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewWarrantyModalProps) {
  const { company } = useCompany();
  const { resellers } = useResellers();
  const [clientType, setClientType] = useState<ClientType>("customer");
  const [productId, setProductId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [requestType, setRequestType] = useState("exchange");
  const [batchCode, setBatchCode] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [reason, setReason] = useState("");
  const [observation, setObservation] = useState("");
  const [unregisteredName, setUnregisteredName] = useState("");
  const [paymentResponsibility, setPaymentResponsibility] = useState<"client" | "company">("client");
  const [exchangeProductId, setExchangeProductId] = useState("");

  // Fetch customers with sales
  const { data: customersWithSales = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-with-sales", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data: sales, error } = await supabase
        .from("sales")
        .select(`
          id,
          client_id,
          customer_name,
          leads:client_id (id, name)
        `)
        .eq("company_id", company.id)
        .not("client_id", "is", null)
        .neq("status", "cancelled");

      if (error) throw error;

      const customerMap = new Map<string, CustomerWithSales>();
      
      sales?.forEach((sale: any) => {
        if (sale.client_id && sale.leads) {
          customerMap.set(sale.client_id, {
            id: sale.client_id,
            name: sale.leads.name,
            client_id: sale.client_id,
          });
        }
      });

      return Array.from(customerMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
    enabled: !!company?.id && open,
  });

  const selectedCustomerName = useMemo(() => {
    const customer = customersWithSales.find(c => c.id === selectedCustomerId);
    return customer?.name || "";
  }, [customersWithSales, selectedCustomerId]);

  // Fetch products purchased by selected customer - expand bundles into components
  const { data: purchasedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["customer-products", selectedCustomerId, company?.id],
    queryFn: async () => {
      if (!company?.id || !selectedCustomerId) return [];

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id, created_at")
        .eq("company_id", company.id)
        .eq("client_id", selectedCustomerId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const saleIds = sales.map(s => s.id);
      const saleRankMap = new Map<string, number>(
        sales.map((sale, index) => [sale.id, index])
      );

      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          sale_id,
          price,
          products:product_id (id, name, type, price)
        `)
        .in("sale_id", saleIds);

      if (itemsError) throw itemsError;

      // Collect bundle IDs to fetch their components
      const bundleIds: string[] = [];
      items?.forEach((item: any) => {
        if (item.products?.type === "bundle") {
          bundleIds.push(item.product_id);
        }
      });

      // Fetch bundle components if any bundles exist
      let bundleComponentsMap = new Map<string, Array<{ id: string; name: string; price: number }>>();
      if (bundleIds.length > 0) {
        const { data: bundleItems, error: bundleError } = await supabase
          .from("bundle_items")
          .select(`
            bundle_id,
            product_id,
            products:product_id (id, name, price)
          `)
          .in("bundle_id", bundleIds);

        if (!bundleError && bundleItems) {
          bundleItems.forEach((bi: any) => {
            if (!bundleComponentsMap.has(bi.bundle_id)) {
              bundleComponentsMap.set(bi.bundle_id, []);
            }
            if (bi.products) {
              bundleComponentsMap.get(bi.bundle_id)!.push({
                id: bi.products.id,
                name: bi.products.name,
                price: Number(bi.products.price) || 0,
              });
            }
          });
        }
      }

      // Build product list: expand bundles into their components
      const productMap = new Map<string, ProductPurchased>();
      const productRankMap = new Map<string, number>();
      
      items?.forEach((item: any) => {
        if (!item.product_id || !item.products) return;
        
        const saleRank = saleRankMap.get(item.sale_id) ?? Number.MAX_SAFE_INTEGER;

        if (item.products.type === "bundle") {
          const components = bundleComponentsMap.get(item.product_id) || [];
          components.forEach((comp) => {
            const currentRank = productRankMap.get(comp.id) ?? Number.MAX_SAFE_INTEGER;
            if (saleRank < currentRank) {
              productMap.set(comp.id, {
                product_id: comp.id,
                product_name: `${comp.name} (Kit: ${item.products.name})`,
                sale_id: item.sale_id,
                is_bundle: false,
                price: comp.price,
              });
              productRankMap.set(comp.id, saleRank);
            }
          });
        } else {
          const currentRank = productRankMap.get(item.product_id) ?? Number.MAX_SAFE_INTEGER;
          if (saleRank < currentRank) {
            productMap.set(item.product_id, {
              product_id: item.product_id,
              product_name: item.products.name,
              sale_id: item.sale_id,
              is_bundle: false,
              price: Number(item.price) || Number(item.products.price) || 0,
            });
            productRankMap.set(item.product_id, saleRank);
          }
        }
      });

      return Array.from(productMap.values()).sort((a, b) => 
        a.product_name.localeCompare(b.product_name)
      );
    },
    enabled: !!company?.id && !!selectedCustomerId && clientType === "customer",
  });

  // Fetch all products for unregistered client or exchange_with_sale
  const { data: allProducts = [], isLoading: loadingAllProducts } = useQuery({
    queryKey: ["all-simple-products", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("company_id", company.id)
        .eq("status", "active")
        .eq("type", "simple")
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id && open,
  });

  const selectedProductSaleId = useMemo(() => {
    const product = purchasedProducts.find(p => p.product_id === productId);
    return product?.sale_id || null;
  }, [purchasedProducts, productId]);

  const selectedProductPrice = useMemo(() => {
    const product = purchasedProducts.find(p => p.product_id === productId);
    return product?.price || 0;
  }, [purchasedProducts, productId]);

  const exchangeProductPrice = useMemo(() => {
    const product = allProducts.find(p => p.id === exchangeProductId);
    return Number(product?.price) || 0;
  }, [allProducts, exchangeProductId]);

  const priceDifference = useMemo(() => {
    if (requestType !== "exchange_with_sale" || !exchangeProductId || !productId) return 0;
    return exchangeProductPrice - selectedProductPrice;
  }, [requestType, exchangeProductId, productId, exchangeProductPrice, selectedProductPrice]);

  // Fetch real lot by replaying FIFO consumption until the selected sale movement
  const { data: batchInfo } = useQuery<ProductBatchInfo>({
    queryKey: ["product-batch-info", productId, selectedProductSaleId, company?.id],
    queryFn: async () => {
      if (!company?.id || !productId || !selectedProductSaleId) {
        return { batch_code: null, batch_date: null };
      }

      const saleToken = `VENDA-${selectedProductSaleId.slice(0, 8)}`;

      const { data: movements, error } = await supabase
        .from("product_batches")
        .select("batch_code, batch_type, quantity, created_at, observation")
        .eq("company_id", company.id)
        .eq("product_id", productId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      type LotQueueItem = {
        batch_code: string;
        batch_date: string | null;
        remaining: number;
      };

      const lotQueue: LotQueueItem[] = [];
      let matchedLot: { batch_code: string; batch_date: string | null } | null = null;

      for (const movement of movements || []) {
        const movementQty = Number(movement.quantity || 0);

        if (movementQty > 0) {
          lotQueue.push({
            batch_code: movement.batch_code,
            batch_date: movement.created_at ? movement.created_at.split("T")[0] : null,
            remaining: movementQty,
          });
          continue;
        }

        if (movementQty < 0) {
          let qtyToConsume = Math.abs(movementQty);
          const isSelectedSaleMovement =
            movement.observation?.includes(`SALE_ID:${selectedProductSaleId}`) ||
            movement.batch_code === saleToken;

          while (qtyToConsume > 0 && lotQueue.length > 0) {
            const currentLot = lotQueue[0];
            const consumed = Math.min(currentLot.remaining, qtyToConsume);

            if (isSelectedSaleMovement && consumed > 0 && !matchedLot) {
              matchedLot = {
                batch_code: currentLot.batch_code,
                batch_date: currentLot.batch_date,
              };
            }

            currentLot.remaining -= consumed;
            qtyToConsume -= consumed;

            if (currentLot.remaining <= 0) {
              lotQueue.shift();
            }
          }

          if (isSelectedSaleMovement && matchedLot) {
            return matchedLot;
          }
        }
      }

      const latestPositiveLot = [...(movements || [])]
        .reverse()
        .find((movement) => Number(movement.quantity || 0) > 0);

      return {
        batch_code: latestPositiveLot?.batch_code || null,
        batch_date: latestPositiveLot?.created_at ? latestPositiveLot.created_at.split("T")[0] : null,
      };
    },
    enabled: !!company?.id && !!productId && !!selectedProductSaleId && clientType === "customer",
  });

  // Update batch fields when batch info is fetched
  useEffect(() => {
    if (batchInfo && clientType === "customer") {
      setBatchCode(batchInfo.batch_code || "");
      setBatchDate(batchInfo.batch_date || "");
    }
  }, [batchInfo, clientType]);

  // For unregistered clients, set batch code to "AA - NÃO RASTREÁVEL"
  useEffect(() => {
    if (clientType === "unregistered" && productId) {
      setBatchCode("AA - NÃO RASTREÁVEL");
      setBatchDate("");
    }
  }, [clientType, productId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !requestType) return;

    const isUnregistered = clientType === "unregistered";

    const data: WarrantySubmitData = {
      product_id: productId,
      customer_name: clientType === "customer" 
        ? selectedCustomerName 
        : isUnregistered 
          ? unregisteredName || "Cliente não cadastrado"
          : undefined,
      reseller_id: clientType === "reseller" ? resellerId : undefined,
      request_type: requestType,
      batch_code: batchCode || undefined,
      batch_date: batchDate || undefined,
      reason: reason || undefined,
      observation: isUnregistered 
        ? `[AA - NÃO RASTREÁVEL] ${observation || ""}`.trim()
        : observation || undefined,
    };

    // Add type-specific fields
    if (requestType === "herd" || requestType === "repair") {
      data.payment_responsibility = paymentResponsibility;
      data.original_product_value = selectedProductPrice;
    }

    if (requestType === "exchange") {
      data.original_product_value = selectedProductPrice;
    }

    if (requestType === "exchange_with_sale") {
      data.exchange_product_id = exchangeProductId;
      data.exchange_product_value = exchangeProductPrice;
      data.original_product_value = selectedProductPrice;
      data.original_sale_id = selectedProductSaleId || undefined;
    }

    onSubmit(data);

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setProductId("");
    setSelectedCustomerId("");
    setResellerId("");
    setRequestType("exchange");
    setBatchCode("");
    setBatchDate("");
    setReason("");
    setObservation("");
    setUnregisteredName("");
    setPaymentResponsibility("client");
    setExchangeProductId("");
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setProductId("");
    setBatchCode("");
    setBatchDate("");
    setExchangeProductId("");
  };

  const handleClientTypeChange = (type: ClientType) => {
    setClientType(type);
    setSelectedCustomerId("");
    setResellerId("");
    setProductId("");
    setBatchCode("");
    setBatchDate("");
    setUnregisteredName("");
    setExchangeProductId("");
  };

  const handleRequestTypeChange = (type: string) => {
    setRequestType(type);
    setPaymentResponsibility("client");
    setExchangeProductId("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Garantia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <RadioGroup
              value={clientType}
              onValueChange={(v) => handleClientTypeChange(v as ClientType)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="customer" id="customer" />
                <Label htmlFor="customer" className="font-normal cursor-pointer">
                  Cliente Final
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="reseller" id="reseller" />
                <Label htmlFor="reseller" className="font-normal cursor-pointer">
                  Revendedor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="unregistered" id="unregistered" />
                <Label htmlFor="unregistered" className="font-normal cursor-pointer">
                  Cliente não cadastrado
                </Label>
              </div>
            </RadioGroup>
          </div>

          {clientType === "customer" ? (
            <>
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={loadingCustomers ? "Carregando..." : "Selecione o cliente"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customersWithSales.length === 0 && !loadingCustomers ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhum cliente com compras encontrado
                      </div>
                    ) : (
                      customersWithSales.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto Comprado *</Label>
                <Select 
                  value={productId} 
                  onValueChange={setProductId}
                  disabled={!selectedCustomerId}
                >
                  <SelectTrigger className="bg-card">
                    <SelectValue 
                      placeholder={
                        !selectedCustomerId 
                          ? "Selecione um cliente primeiro" 
                          : loadingProducts 
                            ? "Carregando produtos..." 
                            : "Selecione o produto"
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {purchasedProducts.length === 0 && !loadingProducts && selectedCustomerId ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado para este cliente
                      </div>
                    ) : (
                      purchasedProducts.map((product) => (
                        <SelectItem key={product.product_id} value={product.product_id}>
                          {product.product_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : clientType === "reseller" ? (
            <>
              <div className="space-y-2">
                <Label>Revendedor</Label>
                <Select value={resellerId} onValueChange={setResellerId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Selecione o revendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {resellers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    <ResellerProductSelect 
                      resellerId={resellerId} 
                      onProductSelect={setProductId}
                      selectedProductId={productId}
                    />
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            /* Cliente não cadastrado */
            <>
              <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input
                  value={unregisteredName}
                  onChange={(e) => setUnregisteredName(e.target.value)}
                  placeholder="Nome do cliente (opcional)"
                  className="bg-card"
                />
              </div>

              <div className="space-y-2">
                <Label>Produto *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue placeholder={loadingAllProducts ? "Carregando..." : "Selecione o produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {allProducts.length === 0 && !loadingAllProducts ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado
                      </div>
                    ) : (
                      allProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {productId && (
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <p className="text-sm text-primary font-medium">
                    ⚠️ AA - NÃO RASTREÁVEL
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este registro não contabiliza como peça com defeito e não possui rastreabilidade de lote.
                  </p>
                </div>
              )}
            </>
          )}

          <div className="space-y-2">
            <Label>Tipo de Solicitação *</Label>
            <Select value={requestType} onValueChange={handleRequestTypeChange}>
              <SelectTrigger className="bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUEST_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type-specific fields */}
          {requestType === "exchange" && productId && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
              <p className="text-sm font-medium text-blue-400">
                ↻ Troca Simples
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                O produto será trocado pelo mesmo. Será registrada saída no estoque.
              </p>
            </div>
          )}

          {(requestType === "herd" || requestType === "repair") && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">
                  {requestType === "herd" ? "🐄 Rebanho" : "🔧 Conserto"} — Quem paga?
                </p>
                <RadioGroup
                  value={paymentResponsibility}
                  onValueChange={(v) => setPaymentResponsibility(v as "client" | "company")}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="paid-client" />
                    <Label htmlFor="paid-client" className="font-normal cursor-pointer">
                      Pago pelo Cliente
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como entrada no financeiro)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="paid-company" />
                    <Label htmlFor="paid-company" className="font-normal cursor-pointer">
                      Pago pela Empresa
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como saída/prejuízo no financeiro)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}

          {requestType === "exchange_with_sale" && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">🔄 Troca com Venda</p>
                
                <div className="space-y-2">
                  <Label>Produto da Troca *</Label>
                  <Select value={exchangeProductId} onValueChange={setExchangeProductId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Selecione o novo produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts
                        .filter(p => p.id !== productId)
                        .map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} — {formatCurrency(Number(product.price))}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {exchangeProductId && (
                  <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor compra anterior:</span>
                      <span>{formatCurrency(selectedProductPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor novo produto:</span>
                      <span>{formatCurrency(exchangeProductPrice)}</span>
                    </div>
                    <div className="border-t border-border pt-2 flex justify-between font-medium">
                      <span>
                        {priceDifference >= 0 ? "Cliente deve pagar:" : "Crédito do cliente:"}
                      </span>
                      <span className={priceDifference >= 0 ? "text-green-400" : "text-red-400"}>
                        {formatCurrency(Math.abs(priceDifference))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {requestType === "total_loss" && productId && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm font-medium text-red-400">
                ⛔ Perda Total
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Registro apenas. Cliente não tem direito a receber outra peça.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código do Lote</Label>
              <Input
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="Ex: LOT-2024-001"
                className="bg-card"
                readOnly={
                  (clientType === "customer" && !!batchInfo?.batch_code) ||
                  clientType === "unregistered"
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Lote</Label>
              <Input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="bg-card"
                readOnly={
                  (clientType === "customer" && !!batchInfo?.batch_date) ||
                  clientType === "unregistered"
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Motivo / Defeito</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Descreva o defeito ou motivo da garantia..."
              className="bg-card resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Observações adicionais..."
              className="bg-card resize-none"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={
                !productId || 
                isLoading || 
                (clientType === "customer" && !selectedCustomerId) ||
                (requestType === "exchange_with_sale" && !exchangeProductId)
              }
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Garantia
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Sub-component for reseller products (from consignment items)
function ResellerProductSelect({ 
  resellerId, 
  onProductSelect,
  selectedProductId 
}: { 
  resellerId: string; 
  onProductSelect: (id: string) => void;
  selectedProductId: string;
}) {
  const { company } = useCompany();
  
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["reseller-consignment-products", resellerId, company?.id],
    queryFn: async () => {
      if (!company?.id || !resellerId) return [];

      const { data, error } = await supabase
        .from("consignment_items")
        .select(`
          product_id,
          products:product_id (id, name)
        `)
        .eq("company_id", company.id)
        .eq("reseller_id", resellerId);

      if (error) throw error;

      const productMap = new Map<string, { id: string; name: string }>();
      
      data?.forEach((item: any) => {
        if (item.product_id && item.products) {
          productMap.set(item.product_id, {
            id: item.product_id,
            name: item.products.name,
          });
        }
      });

      return Array.from(productMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    },
    enabled: !!company?.id && !!resellerId,
  });

  if (!resellerId) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        Selecione um revendedor primeiro
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        Carregando produtos...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
        Nenhum produto em consignação
      </div>
    );
  }

  return (
    <>
      {products.map((product) => (
        <SelectItem key={product.id} value={product.id}>
          {product.name}
        </SelectItem>
      ))}
    </>
  );
}
