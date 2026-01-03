import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface InstallmentRule {
  installments: number;
  interest_rate_percent: number;
  pass_to_customer: boolean;
}

export interface PaymentGateway {
  id: string;
  company_id: string;
  name: string;
  type: string;
  service_fee_percent: number;
  active: boolean;
  installment_rules: InstallmentRule[];
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
      return (data || []).map(g => ({
        ...g,
        installment_rules: (g.installment_rules as unknown as InstallmentRule[]) || [],
      })) as PaymentGateway[];
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
          installment_rules: data.installment_rules as unknown as any,
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
      const updateData: Record<string, any> = { ...data };
      if (data.installment_rules) {
        updateData.installment_rules = data.installment_rules as unknown as any;
      }
      const { error } = await supabase
        .from("payment_gateways")
        .update(updateData)
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

  // Calculate interest for a gateway-specific installment
  const calculateGatewayInterest = (
    gateway: PaymentGateway,
    amount: number,
    installments: number,
    interestStartsAt: number
  ): { interestAmount: number; passToCustomer: boolean } => {
    // Check if interest should be applied based on global setting
    if (installments < interestStartsAt) {
      return { interestAmount: 0, passToCustomer: false };
    }

    // Find the specific rule for this installment count
    const rule = gateway.installment_rules.find(r => r.installments === installments);
    
    if (!rule) {
      return { interestAmount: 0, passToCustomer: false };
    }

    const interestAmount = amount * (rule.interest_rate_percent / 100);
    return { interestAmount, passToCustomer: rule.pass_to_customer };
  };

  // Get max installments for a gateway
  const getMaxInstallments = (gateway: PaymentGateway): number => {
    if (gateway.installment_rules.length === 0) return 1;
    return Math.max(...gateway.installment_rules.map(r => r.installments), 1);
  };

  return {
    gateways: gateways || [],
    activeGateways,
    isLoading,
    createGateway,
    updateGateway,
    deleteGateway,
    calculateGatewayInterest,
    getMaxInstallments,
  };
}
