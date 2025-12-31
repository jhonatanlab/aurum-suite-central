import { useCompany, CrmSettings } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const DEFAULT_SETTINGS: CrmSettings = {
  enable_sales_column: false,
  auto_move_to_sales: false,
};

export function useCrmSettings() {
  const { company, refetch } = useCompany();
  const queryClient = useQueryClient();

  const settings: CrmSettings = {
    ...DEFAULT_SETTINGS,
    ...((company?.crm_settings as unknown as CrmSettings) || {}),
  };

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<CrmSettings>) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from("companies")
        .update({ crm_settings: updatedSettings })
        .eq("id", company.id);

      if (error) throw error;
      return updatedSettings;
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
    },
  });

  return {
    settings,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
