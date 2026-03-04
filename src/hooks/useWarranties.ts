import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import type { WarrantySubmitData } from "@/components/garantias/NewWarrantyModal";

export interface WarrantyRequest {
  id: string;
  company_id: string;
  product_id: string;
  customer_name: string | null;
  reseller_id: string | null;
  request_type: string;
  batch_code: string | null;
  batch_date: string | null;
  status: string;
  reason: string | null;
  resolution: string | null;
  resolution_date: string | null;
  resolved_by: string | null;
  observation: string | null;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    category: string | null;
  };
  reseller?: {
    id: string;
    name: string;
  } | null;
}

export interface WarrantyStats {
  totalInWarranty: number;
  exchangesInPeriod: number;
  recurrences: number;
  mostProblematicProduct: {
    name: string;
    count: number;
  } | null;
}

interface WarrantyFilters {
  search?: string;
  status?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function useWarranties(filters?: WarrantyFilters) {
  const { company } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ["warranties", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("warranty_requests")
        .select(`
          *,
          product:products(id, name, category),
          reseller:resellers(id, name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.type && filters.type !== "all") {
        query = query.eq("request_type", filters.type);
      }

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      let result = data as WarrantyRequest[];
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (w) =>
            w.customer_name?.toLowerCase().includes(searchLower) ||
            w.product?.name.toLowerCase().includes(searchLower) ||
            w.batch_code?.toLowerCase().includes(searchLower) ||
            w.reseller?.name?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
    enabled: !!company?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ["warranty-stats", company?.id, filters?.dateFrom, filters?.dateTo],
    queryFn: async (): Promise<WarrantyStats> => {
      if (!company?.id) {
        return {
          totalInWarranty: 0,
          exchangesInPeriod: 0,
          recurrences: 0,
          mostProblematicProduct: null,
        };
      }

      let query = supabase
        .from("warranty_requests")
        .select(`
          id,
          status,
          request_type,
          product_id,
          batch_code,
          product:products(name)
        `)
        .eq("company_id", company.id);

      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const typedData = data as Array<{
        id: string;
        status: string;
        request_type: string;
        product_id: string;
        batch_code?: string | null;
        product: { name: string } | null;
      }>;

      const trackableData = typedData.filter(
        (w) => !w.batch_code?.includes("AA - NÃO RASTREÁVEL")
      );

      const totalInWarranty = trackableData.filter(
        (w) => w.status === "analyzing" || w.status === "approved"
      ).length;

      const exchangesInPeriod = trackableData.filter(
        (w) => w.request_type === "exchange" && w.status === "completed"
      ).length;

      const productCounts: Record<string, { count: number; name: string }> = {};
      trackableData.forEach((w) => {
        if (!productCounts[w.product_id]) {
          productCounts[w.product_id] = {
            count: 0,
            name: w.product?.name || "Desconhecido",
          };
        }
        productCounts[w.product_id].count++;
      });

      const recurrences = Object.values(productCounts).filter(
        (p) => p.count > 1
      ).length;

      const mostProblematic = Object.entries(productCounts).reduce(
        (max, [_, value]) => (value.count > (max?.count || 0) ? value : max),
        null as { count: number; name: string } | null
      );

      return {
        totalInWarranty,
        exchangesInPeriod,
        recurrences,
        mostProblematicProduct: mostProblematic,
      };
    },
    enabled: !!company?.id,
  });

  const createWarranty = useMutation({
    mutationFn: async (data: WarrantySubmitData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const userEmail = user?.email || "sistema";
      const today = new Date().toISOString().split("T")[0];

      // 1. Create the warranty request record
      const { error: warrantyError } = await supabase.from("warranty_requests").insert({
        company_id: company.id,
        product_id: data.product_id,
        customer_name: data.customer_name,
        reseller_id: data.reseller_id,
        request_type: data.request_type,
        batch_code: data.batch_code,
        batch_date: data.batch_date,
        reason: data.reason,
        observation: data.observation,
      });

      if (warrantyError) throw warrantyError;

      // 2. Type-specific side effects
      const productValue = data.original_product_value || 0;

      // --- TROCA SIMPLES: Stock out (same product leaves inventory for replacement) ---
      if (data.request_type === "exchange") {
        await supabase.from("product_batches").insert({
          company_id: company.id,
          product_id: data.product_id,
          batch_code: `GARANTIA-TROCA-${Date.now().toString(36).toUpperCase()}`,
          batch_type: "adjustment",
          quantity: -1,
          status: "active",
          created_by: userEmail,
          observation: `Saída por garantia - Troca Simples`,
        });
      }

      // --- REBANHO: Financial entry based on who pays ---
      if (data.request_type === "herd" && productValue > 0) {
        if (data.payment_responsibility === "client") {
          // Client pays → income
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Rebanho - Pago pelo Cliente${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "entrada",
            value: productValue,
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "dinheiro",
            origin: "warranty",
          });
        } else {
          // Company pays → expense/loss
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Rebanho - Prejuízo da Empresa${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "saida",
            value: productValue,
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "outros",
            origin: "warranty",
          });
        }
      }

      // --- TROCA COM VENDA: New sale + financial + stock reduction ---
      if (data.request_type === "exchange_with_sale" && data.exchange_product_id) {
        const exchangeValue = data.exchange_product_value || 0;
        const diff = exchangeValue - productValue;

        // Create a new sale record
        const { data: saleData, error: saleError } = await supabase
          .from("sales")
          .insert({
            company_id: company.id,
            client_id: data.customer_name ? undefined : undefined,
            customer_name: data.customer_name || "Garantia - Troca com Venda",
            total: exchangeValue,
            subtotal: exchangeValue,
            status: "completed",
            payment_method: "garantia",
            origin: "warranty",
          })
          .select("id")
          .single();

        if (saleError) throw saleError;

        // Create sale item
        await supabase.from("sale_items").insert({
          sale_id: saleData.id,
          product_id: data.exchange_product_id,
          quantity: 1,
          price: exchangeValue,
          subtotal: exchangeValue,
        });

        // Stock reduction for the new product sold
        await supabase.from("product_batches").insert({
          company_id: company.id,
          product_id: data.exchange_product_id,
          batch_code: `VENDA-${saleData.id.slice(0, 8)}`,
          batch_type: "sale",
          quantity: -1,
          status: "active",
          created_by: userEmail,
          observation: `Garantia Troca com Venda - SALE_ID:${saleData.id}`,
        });

        // Financial: if client needs to pay difference
        if (diff > 0) {
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Troca com Venda - Diferença${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "entrada",
            value: diff,
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "dinheiro",
            origin: `sale:${saleData.id}`,
            reference_id: saleData.id,
          });
        } else if (diff < 0) {
          // Company owes the client (credit)
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Troca com Venda - Crédito ao Cliente${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "saida",
            value: Math.abs(diff),
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "dinheiro",
            origin: `sale:${saleData.id}`,
            reference_id: saleData.id,
          });
        }
      }

      // --- CONSERTO: Financial based on who pays ---
      if (data.request_type === "repair" && productValue > 0) {
        if (data.payment_responsibility === "client") {
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Conserto - Pago pelo Cliente${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "entrada",
            value: productValue,
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "dinheiro",
            origin: "warranty",
          });
        } else {
          await supabase.from("financial_transactions").insert({
            company_id: company.id,
            description: `Garantia Conserto - Custo da Empresa${data.customer_name ? ` (${data.customer_name})` : ""}`,
            type: "saida",
            value: productValue,
            date: today,
            status: "pago",
            paid_at: new Date().toISOString(),
            method: "outros",
            origin: "warranty",
          });
        }
      }

      // --- PERDA TOTAL: No side effects, just the warranty record ---
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranty-stats"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Garantia registrada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao registrar garantia: " + error.message);
    },
  });

  const updateWarranty = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: string;
      resolution?: string;
      observation?: string;
    }) => {
      const updateData: Record<string, unknown> = { ...data };

      if (data.status === "completed" || data.status === "denied") {
        updateData.resolution_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("warranty_requests")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranty-stats"] });
      toast.success("Garantia atualizada!");
    },
    onError: (error) => {
      toast.error("Erro ao atualizar garantia: " + error.message);
    },
  });

  return {
    warranties,
    stats: stats || {
      totalInWarranty: 0,
      exchangesInPeriod: 0,
      recurrences: 0,
      mostProblematicProduct: null,
    },
    isLoading,
    createWarranty,
    updateWarranty,
  };
}
