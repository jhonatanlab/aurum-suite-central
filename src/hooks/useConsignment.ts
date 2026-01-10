import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

export interface ConsignmentItem {
  id: string;
  reseller_id: string;
  product_id: string;
  consignment_value: number;
  sent_at: string;
  observation: string | null;
  status: string;
  sold_at: string | null;
  created_at: string;
  product?: {
    id: string;
    name: string;
  };
}

export interface AddBatchItem {
  product_id: string;
  consignment_value: number;
}

export interface AddBatchPayload {
  reseller_id: string;
  sent_at: string;
  observation: string;
  items: AddBatchItem[];
}

export function useConsignment(resellerId: string) {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["consignment-items", resellerId],
    queryFn: async () => {
      if (!company?.id || !resellerId) return [];

      const { data, error } = await supabase
        .from("consignment_items")
        .select(`
          id,
          reseller_id,
          product_id,
          consignment_value,
          sent_at,
          observation,
          status,
          sold_at,
          created_at,
          products:product_id (id, name)
        `)
        .eq("company_id", company.id)
        .eq("reseller_id", resellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return data.map((item) => ({
        ...item,
        product: item.products as { id: string; name: string } | undefined,
      })) as ConsignmentItem[];
    },
    enabled: !!company?.id && !!resellerId,
  });

  const addBatch = useMutation({
    mutationFn: async (payload: AddBatchPayload) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      // Prepare items for insertion
      const insertData = payload.items.map((item) => ({
        company_id: company.id,
        reseller_id: payload.reseller_id,
        product_id: item.product_id,
        consignment_value: item.consignment_value,
        sent_at: payload.sent_at,
        observation: payload.observation || null,
        status: "with_reseller",
      }));

      const { error } = await supabase
        .from("consignment_items")
        .insert(insertData);

      if (error) throw error;

      // Add history entry
      await supabase.from("reseller_history").insert({
        reseller_id: payload.reseller_id,
        action: "consignment_added",
        description: `Lote de ${payload.items.length} peça(s) consignada(s)`,
        created_by: "Sistema",
      });

      return { count: payload.items.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consignment-items", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history", resellerId] });
      toast.success(`${data.count} peça(s) consignada(s) com sucesso`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao consignar peças: " + error.message);
    },
  });

  // Calculate metrics
  const metrics = {
    totalPieces: items.length,
    withReseller: items.filter((i) => i.status === "with_reseller").length,
    totalSold: items.filter((i) => i.status === "sold").length,
    profitGenerated: items
      .filter((i) => i.status === "sold")
      .reduce((acc, i) => acc + Number(i.consignment_value), 0),
  };

  return {
    items,
    isLoading,
    metrics,
    addBatch,
  };
}
