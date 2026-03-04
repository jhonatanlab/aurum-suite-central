import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

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

      // Client-side search filter
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
        product: { name: string } | null;
      }>;

      // Exclude "AA - NÃO RASTREÁVEL" from defect stats
      const trackableData = typedData.filter(
        (w) => !(w as any).batch_code?.includes("AA - NÃO RASTREÁVEL")
      );

      // Calculate stats (only trackable warranties count as defects)
      const totalInWarranty = trackableData.filter(
        (w) => w.status === "analyzing" || w.status === "approved"
      ).length;

      const exchangesInPeriod = trackableData.filter(
        (w) => w.request_type === "exchange" && w.status === "completed"
      ).length;

      // Recurrences: products with more than 1 warranty request
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

      // Most problematic product
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
    mutationFn: async (data: {
      product_id: string;
      customer_name?: string;
      reseller_id?: string;
      request_type: string;
      batch_code?: string;
      batch_date?: string;
      reason?: string;
      observation?: string;
    }) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("warranty_requests").insert({
        company_id: company.id,
        ...data,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      queryClient.invalidateQueries({ queryKey: ["warranty-stats"] });
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
