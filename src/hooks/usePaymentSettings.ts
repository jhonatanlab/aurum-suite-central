import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface InstallmentRule {
  installments: number;
  pass_interest_to_customer: boolean;
}

export interface PaymentSettings {
  max_installments: number;
  interest_rate_percent: number;
  interest_starts_at: number;
  pass_interest_to_customer: boolean;
  installment_rules: InstallmentRule[];
}

const defaultSettings: PaymentSettings = {
  max_installments: 12,
  interest_rate_percent: 0,
  interest_starts_at: 1,
  pass_interest_to_customer: true,
  installment_rules: [],
};

export function usePaymentSettings() {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["payment-settings", company?.id],
    queryFn: async () => {
      if (!company?.id) return defaultSettings;
      
      const { data, error } = await supabase
        .from("companies")
        .select("payment_settings")
        .eq("id", company.id)
        .single();
      
      if (error) throw error;
      
      return (data?.payment_settings as unknown as PaymentSettings) || defaultSettings;
    },
    enabled: !!company?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<PaymentSettings>) => {
      if (!company?.id) throw new Error("Empresa não encontrada");
      
      const updatedSettings = {
        ...settings,
        ...newSettings,
      };
      
      const { error } = await supabase
        .from("companies")
        .update({ payment_settings: updatedSettings as any })
        .eq("id", company.id);
      
      if (error) throw error;
      return updatedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings", company?.id] });
    },
  });

  // Calculate interest for a given amount and installments
  const calculateInterest = (amount: number, installments: number): {
    interestAmount: number;
    totalWithInterest: number;
    passToCustomer: boolean;
  } => {
    const s = settings || defaultSettings;
    
    if (installments < s.interest_starts_at || s.interest_rate_percent <= 0) {
      return { interestAmount: 0, totalWithInterest: amount, passToCustomer: false };
    }
    
    // Check if there's a specific rule for this installment count
    const rule = s.installment_rules.find(r => r.installments === installments);
    const passToCustomer = rule ? rule.pass_interest_to_customer : s.pass_interest_to_customer;
    
    // Calculate compound interest per installment
    const monthlyRate = s.interest_rate_percent / 100;
    const interestAmount = amount * monthlyRate * installments;
    const totalWithInterest = amount + interestAmount;
    
    return { interestAmount, totalWithInterest, passToCustomer };
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    updateSettings,
    calculateInterest,
  };
}
