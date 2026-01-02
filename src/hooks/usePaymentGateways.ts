import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface PaymentGateway {
  id: string;
  company_id: string;
  name: string;
  type: string;
  service_fee_percent: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePaymentGateways() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const { data: gateways, isLoading } = useQuery({
    queryKey: ["payment-gateways", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("payment_gateways")
        .select("*")
        .eq("company_id", company.id)
        .order("name");
      if (error) throw error;
      return data as PaymentGateway[];
    },
    enabled: !!company?.id,
  });

  const activeGateways = gateways?.filter(g => g.active) || [];

  const createGateway = useMutation({
    mutationFn: async (data: Omit<PaymentGateway, "id" | "company_id" | "created_at" | "updated_at">) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      const { data: result, error } = await supabase
        .from("payment_gateways")
        .insert({
          ...data,
          company_id: company.id,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateways", company?.id] });
    },
  });

  const updateGateway = useMutation({
    mutationFn: async ({ id, ...data }: Partial<PaymentGateway> & { id: string }) => {
      const { error } = await supabase
        .from("payment_gateways")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateways", company?.id] });
    },
  });

  const deleteGateway = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_gateways")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-gateways", company?.id] });
    },
  });

  return {
    gateways: gateways || [],
    activeGateways,
    isLoading,
    createGateway,
    updateGateway,
    deleteGateway,
  };
}
