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
import { Loader2, ArrowRight, AlertCircle, Percent, Lock } from "lucide-react";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

export interface WarrantySubmitData {
  product_id: string;
  customer_name?: string;
  client_id?: string;
  reseller_id?: string;
  request_type: string;
  batch_code?: string;
  batch_date?: string;
  reason?: string;
  observation?: string;
  payment_responsibility?: "client" | "company";
  exchange_product_id?: string;
  exchange_product_value?: number;
  original_product_value?: number;
  original_sale_id?: string;
  custom_value?: number;
  payment_method?: string;
  installments?: number;
  gateway_id?: string;
  interest_amount?: number;
  gateway_fee_amount?: number;
  gateway_fee_percent?: number;
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

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
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
  const { activeGateways, calculateGatewayInterest } = usePaymentGateways();
  const { settings: paymentSettings } = usePaymentSettings();
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
  const [customValue, setCustomValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [exchangeSimpleProductId, setExchangeSimpleProductId] = useState("");
  const [gatewayId, setGatewayId] = useState<string | null>(null);
  const [installments, setInstallments] = useState(1);

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

  // Fetch existing warranty exchanges for this customer to prevent duplicates
  const { data: existingWarranties = [] } = useQuery({
    queryKey: ["existing-warranty-exchanges", selectedCustomerId, company?.id],
    queryFn: async () => {
      if (!company?.id || !selectedCustomerId) return [];

      const customer = customersWithSales.find(c => c.id === selectedCustomerId);
      if (!customer) return [];

      const { data, error } = await supabase
        .from("warranty_requests")
        .select("product_id, exchange_product_id, request_type, status")
        .eq("company_id", company.id)
        .eq("customer_name", customer.name)
        .in("request_type", ["exchange", "exchange_with_sale"])
        .neq("status", "denied");

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.id && !!selectedCustomerId && clientType === "customer",
  });

  // Products that were exchanged (locked) - original products from warranty
  const exchangedProductIds = useMemo(() => {
    const ids = new Set<string>();
    existingWarranties.forEach(w => ids.add(w.product_id));
    return ids;
  }, [existingWarranties]);

  // Products received from exchange (available for future exchange) - exchange_product_id from Troca Simples
  const exchangeReceivedProducts = useMemo(() => {
    const products: Array<{ product_id: string; product_name: string; sale_id: string; is_bundle: boolean; price: number }> = [];
    return products; // These will be added from allProducts below
  }, []);

  // Fetch products purchased by selected customer - expand bundles into components
  const { data: purchasedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["customer-products", selectedCustomerId, company?.id, existingWarrantyProducts],
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

      const bundleIds: string[] = [];
      items?.forEach((item: any) => {
        if (item.products?.type === "bundle") {
          bundleIds.push(item.product_id);
        }
      });

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

      const results = Array.from(productMap.values());

      return results.sort((a, b) => 
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

  // Products with higher price for exchange_with_sale
  const exchangeEligibleProducts = useMemo(() => {
    if (!productId || requestType !== "exchange_with_sale") return [];
    return allProducts.filter(p => p.id !== productId && Number(p.price) > selectedProductPrice);
  }, [allProducts, productId, selectedProductPrice, requestType]);

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

  useEffect(() => {
    if (batchInfo && clientType === "customer") {
      setBatchCode(batchInfo.batch_code || "");
      setBatchDate(batchInfo.batch_date || "");
    }
  }, [batchInfo, clientType]);

  useEffect(() => {
    if (clientType === "unregistered" && productId) {
      setBatchCode("AA - NÃO RASTREÁVEL");
      setBatchDate("");
    }
  }, [clientType, productId]);

  // Set default custom value based on product price
  useEffect(() => {
    if ((requestType === "herd" || requestType === "repair") && productId) {
      setCustomValue(selectedProductPrice.toString());
    }
  }, [requestType, productId, selectedProductPrice]);

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
      data.custom_value = parseFloat(customValue) || selectedProductPrice;
      data.original_product_value = selectedProductPrice;
    }

    if (requestType === "exchange") {
      data.original_product_value = selectedProductPrice;
      data.exchange_product_id = exchangeSimpleProductId || productId;
    }

    if (requestType === "exchange_with_sale") {
      data.exchange_product_id = exchangeProductId;
      data.exchange_product_value = exchangeProductPrice;
      data.original_product_value = selectedProductPrice;
      data.original_sale_id = selectedProductSaleId || undefined;
      data.payment_method = paymentMethod;
      data.installments = installments;
      data.gateway_id = gatewayId || undefined;
      
      // Calculate interest/fees if gateway selected
      if (gatewayId && paymentMethod === "cartao_credito") {
        const gateway = activeGateways.find(g => g.id === gatewayId);
        if (gateway) {
          const { interestAmount, passToCustomer } = calculateGatewayInterest(
            gateway,
            priceDifference,
            installments,
            paymentSettings.interest_starts_at
          );
          data.interest_amount = interestAmount;
          data.gateway_fee_percent = gateway.service_fee_percent;
          data.gateway_fee_amount = priceDifference * (gateway.service_fee_percent / 100);
        }
      }
    }

    // Pass client_id for CRM integration
    if (clientType === "customer" && selectedCustomerId) {
      data.client_id = selectedCustomerId;
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
    setCustomValue("");
    setPaymentMethod("pix");
    setExchangeSimpleProductId("");
    setGatewayId(null);
    setInstallments(1);
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setProductId("");
    setBatchCode("");
    setBatchDate("");
    setExchangeProductId("");
    setExchangeSimpleProductId("");
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
    setExchangeSimpleProductId("");
  };

  const handleRequestTypeChange = (type: string) => {
    setRequestType(type);
    setPaymentResponsibility("client");
    setExchangeProductId("");
    setExchangeSimpleProductId("");
    setPaymentMethod("pix");
    setGatewayId(null);
    setInstallments(1);
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
                      purchasedProducts.map((product) => {
                        const isLocked = exchangedProductIds.has(product.product_id);
                        return (
                          <SelectItem 
                            key={product.product_id} 
                            value={product.product_id}
                            disabled={isLocked}
                          >
                            <div className="flex items-center gap-2">
                              {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                              <span className={isLocked ? "text-muted-foreground" : ""}>
                                {product.product_name}
                              </span>
                              {isLocked && (
                                <span className="text-xs text-muted-foreground">(já trocado)</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
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

          {/* TROCA SIMPLES: Select product to send + stock out */}
          {requestType === "exchange" && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">
                  ↻ Troca Simples — Selecione o produto de reposição
                </p>
                <p className="text-xs text-muted-foreground">
                  O produto selecionado terá saída registrada no estoque.
                </p>
                <div className="space-y-2">
                  <Label>Produto para Troca *</Label>
                  <Select value={exchangeSimpleProductId} onValueChange={setExchangeSimpleProductId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {allProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* REBANHO: Quem paga + valor */}
          {requestType === "herd" && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">
                  Rebanho — Quem paga?
                </p>
                <RadioGroup
                  value={paymentResponsibility}
                  onValueChange={(v) => setPaymentResponsibility(v as "client" | "company")}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="herd-paid-client" />
                    <Label htmlFor="herd-paid-client" className="font-normal cursor-pointer">
                      Pago pelo Cliente
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como entrada no financeiro)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="herd-paid-company" />
                    <Label htmlFor="herd-paid-company" className="font-normal cursor-pointer">
                      Pago pela Empresa
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como saída/prejuízo no financeiro)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="0,00"
                    className="bg-card"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CONSERTO: Quem paga + valor */}
          {requestType === "repair" && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">
                  🔧 Conserto — Quem paga?
                </p>
                <RadioGroup
                  value={paymentResponsibility}
                  onValueChange={(v) => setPaymentResponsibility(v as "client" | "company")}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="client" id="repair-paid-client" />
                    <Label htmlFor="repair-paid-client" className="font-normal cursor-pointer">
                      Pago pelo Cliente
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como entrada no financeiro)
                      </span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="company" id="repair-paid-company" />
                    <Label htmlFor="repair-paid-company" className="font-normal cursor-pointer">
                      Pago pela Empresa
                      <span className="text-xs text-muted-foreground ml-2">
                        (registra como saída no financeiro)
                      </span>
                    </Label>
                  </div>
                </RadioGroup>

                <div className="space-y-2">
                  <Label>Valor do Conserto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder="0,00"
                    className="bg-card"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TROCA COM VENDA: Only higher-priced products + payment method */}
          {requestType === "exchange_with_sale" && productId && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card/50 p-3 space-y-3">
                <p className="text-sm font-medium">🔄 Troca com Venda</p>
                
                <div className="space-y-2">
                  <Label>Produto da Troca (valor superior) *</Label>
                  <Select value={exchangeProductId} onValueChange={setExchangeProductId}>
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Selecione o novo produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {exchangeEligibleProducts.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Nenhum produto com valor superior a {formatCurrency(selectedProductPrice)}
                        </div>
                      ) : (
                        exchangeEligibleProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} — {formatCurrency(Number(product.price))}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {exchangeProductId && (
                  <>
                    <div className="rounded-lg bg-muted/50 p-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor compra anterior (desconto):</span>
                        <span className="text-destructive">-{formatCurrency(selectedProductPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor novo produto:</span>
                        <span>{formatCurrency(exchangeProductPrice)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between font-medium">
                        <span>Cliente deve pagar:</span>
                        <span className="text-primary">
                          {formatCurrency(priceDifference)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Forma de Pagamento *</Label>
                      <Select 
                        value={paymentMethod} 
                        onValueChange={(v) => {
                          setPaymentMethod(v);
                          if (v !== "cartao_credito") {
                            setGatewayId(null);
                            setInstallments(1);
                          }
                        }}
                      >
                        <SelectTrigger className="bg-card">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentMethod === "cartao_credito" && activeGateways.length > 0 && (
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Gateway / Maquininha</Label>
                          <Select
                            value={gatewayId || "none"}
                            onValueChange={(value) => {
                              setGatewayId(value === "none" ? null : value);
                              setInstallments(1);
                            }}
                          >
                            <SelectTrigger className="bg-card">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Selecione um gateway</SelectItem>
                              {activeGateways.map((gw) => (
                                <SelectItem key={gw.id} value={gw.id}>
                                  {gw.name} (taxa: {gw.service_fee_percent}%)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {gatewayId && (() => {
                          const gateway = activeGateways.find(g => g.id === gatewayId);
                          if (!gateway || gateway.installment_rules.length === 0) return null;
                          
                          const installmentOptions = gateway.installment_rules
                            .sort((a: any, b: any) => a.installments - b.installments)
                            .map((rule: any) => {
                              const { interestAmount, passToCustomer } = calculateGatewayInterest(
                                gateway,
                                priceDifference,
                                rule.installments,
                                paymentSettings.interest_starts_at
                              );
                              const label = interestAmount > 0
                                ? `${rule.installments}x (+${formatCurrency(interestAmount)}${passToCustomer ? "" : " custo"})`
                                : `${rule.installments}x (sem juros)`;
                              return { value: rule.installments, label };
                            });

                          return (
                            <div className="space-y-1">
                              <Label className="text-xs">Parcelas</Label>
                              <Select
                                value={installments.toString()}
                                onValueChange={(v) => setInstallments(parseInt(v))}
                              >
                                <SelectTrigger className="bg-card">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {installmentOptions.map((opt: any) => (
                                    <SelectItem key={opt.value} value={opt.value.toString()}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {paymentMethod === "cartao_credito" && activeGateways.length === 0 && (
                      <div className="text-xs text-amber-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Configure gateways em Meu Negócio → Pagamentos
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {requestType === "total_loss" && productId && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-medium text-destructive">
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
                (requestType === "exchange_with_sale" && !exchangeProductId) ||
                (requestType === "exchange" && !exchangeSimpleProductId)
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
