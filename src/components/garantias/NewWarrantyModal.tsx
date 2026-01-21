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
import { Loader2 } from "lucide-react";

interface NewWarrantyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    product_id: string;
    customer_name?: string;
    reseller_id?: string;
    request_type: string;
    batch_code?: string;
    batch_date?: string;
    reason?: string;
    observation?: string;
  }) => void;
  isLoading: boolean;
}

const REQUEST_TYPES = [
  { value: "exchange", label: "Troca Simples" },
  { value: "herd", label: "Rebanho" },
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
}

interface ProductBatchInfo {
  batch_code: string | null;
  batch_date: string | null;
}

export function NewWarrantyModal({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: NewWarrantyModalProps) {
  const { company } = useCompany();
  const { resellers } = useResellers();
  const [clientType, setClientType] = useState<"customer" | "reseller">("customer");
  const [productId, setProductId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [resellerId, setResellerId] = useState("");
  const [requestType, setRequestType] = useState("exchange");
  const [batchCode, setBatchCode] = useState("");
  const [batchDate, setBatchDate] = useState("");
  const [reason, setReason] = useState("");
  const [observation, setObservation] = useState("");

  // Fetch customers with sales (using leads as clients)
  const { data: customersWithSales = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers-with-sales", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      // Get all sales with client_id (linked to leads)
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

      // Create unique customer list
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

  // Get selected customer name for display
  const selectedCustomerName = useMemo(() => {
    const customer = customersWithSales.find(c => c.id === selectedCustomerId);
    return customer?.name || "";
  }, [customersWithSales, selectedCustomerId]);

  // Fetch products purchased by selected customer
  const { data: purchasedProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["customer-products", selectedCustomerId, company?.id],
    queryFn: async () => {
      if (!company?.id || !selectedCustomerId) return [];

      // Get all sales for this customer
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("id")
        .eq("company_id", company.id)
        .eq("client_id", selectedCustomerId)
        .neq("status", "cancelled");

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const saleIds = sales.map(s => s.id);

      // Get all products from those sales with sale_id
      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`
          product_id,
          sale_id,
          products:product_id (id, name)
        `)
        .in("sale_id", saleIds);

      if (itemsError) throw itemsError;

      // Create unique product list (keeping the first sale_id for each product)
      const productMap = new Map<string, ProductPurchased>();
      
      items?.forEach((item: any) => {
        if (item.product_id && item.products && !productMap.has(item.product_id)) {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            product_name: item.products.name,
            sale_id: item.sale_id,
          });
        }
      });

      return Array.from(productMap.values()).sort((a, b) => 
        a.product_name.localeCompare(b.product_name)
      );
    },
    enabled: !!company?.id && !!selectedCustomerId && clientType === "customer",
  });

  // Fetch batch info when product is selected (for customer type)
  const { data: batchInfo } = useQuery<ProductBatchInfo>({
    queryKey: ["product-batch-info", productId, selectedCustomerId, company?.id],
    queryFn: async () => {
      if (!company?.id || !productId) return { batch_code: null, batch_date: null };

      // Get the batch info for this product from product_batches
      const { data: batches, error } = await supabase
        .from("product_batches")
        .select("batch_code, created_at")
        .eq("company_id", company.id)
        .eq("product_id", productId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error || !batches || batches.length === 0) {
        return { batch_code: null, batch_date: null };
      }

      const batch = batches[0];
      return {
        batch_code: batch.batch_code,
        batch_date: batch.created_at ? batch.created_at.split("T")[0] : null,
      };
    },
    enabled: !!company?.id && !!productId && clientType === "customer",
  });

  // Update batch fields when batch info is fetched
  useEffect(() => {
    if (batchInfo && clientType === "customer") {
      setBatchCode(batchInfo.batch_code || "");
      setBatchDate(batchInfo.batch_date || "");
    }
  }, [batchInfo, clientType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId || !requestType) return;

    onSubmit({
      product_id: productId,
      customer_name: clientType === "customer" ? selectedCustomerName : undefined,
      reseller_id: clientType === "reseller" ? resellerId : undefined,
      request_type: requestType,
      batch_code: batchCode || undefined,
      batch_date: batchDate || undefined,
      reason: reason || undefined,
      observation: observation || undefined,
    });

    // Reset form
    setProductId("");
    setSelectedCustomerId("");
    setResellerId("");
    setRequestType("exchange");
    setBatchCode("");
    setBatchDate("");
    setReason("");
    setObservation("");
    onOpenChange(false);
  };

  // Reset product when customer changes
  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setProductId(""); // Reset product selection
    setBatchCode("");
    setBatchDate("");
  };

  // Reset selections when client type changes
  const handleClientTypeChange = (type: "customer" | "reseller") => {
    setClientType(type);
    setSelectedCustomerId("");
    setResellerId("");
    setProductId("");
    setBatchCode("");
    setBatchDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Garantia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Cliente</Label>
            <RadioGroup
              value={clientType}
              onValueChange={(v) => handleClientTypeChange(v as "customer" | "reseller")}
              className="flex gap-4"
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
          ) : (
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
          )}

          <div className="space-y-2">
            <Label>Tipo de Solicitação *</Label>
            <Select value={requestType} onValueChange={setRequestType}>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Código do Lote</Label>
              <Input
                value={batchCode}
                onChange={(e) => setBatchCode(e.target.value)}
                placeholder="Ex: LOT-2024-001"
                className="bg-card"
                readOnly={clientType === "customer" && !!batchInfo?.batch_code}
              />
            </div>
            <div className="space-y-2">
              <Label>Data do Lote</Label>
              <Input
                type="date"
                value={batchDate}
                onChange={(e) => setBatchDate(e.target.value)}
                className="bg-card"
                readOnly={clientType === "customer" && !!batchInfo?.batch_date}
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
                (clientType === "customer" && !selectedCustomerId)
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

      // Create unique product list
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
