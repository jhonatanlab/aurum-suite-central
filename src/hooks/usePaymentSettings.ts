import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PaymentSettings {
  interest_starts_at: number;
}

const defaultSettings: PaymentSettings = {
  interest_starts_at: 1,
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
      
      const rawSettings = data?.payment_settings as unknown as Record<string, any>;
      return {
        interest_starts_at: rawSettings?.interest_starts_at ?? defaultSettings.interest_starts_at,
      } as PaymentSettings;
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

  return {
    settings: settings || defaultSettings,
    isLoading,
    updateSettings,
  };
}
