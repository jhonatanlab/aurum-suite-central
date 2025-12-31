import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCrmSettings } from "@/hooks/useCrmSettings";

const SALES_COLUMN_NAME = "Vendas";

export function useSalesColumn() {
  const { company } = useCompany();
  const { settings } = useCrmSettings();
  const queryClient = useQueryClient();

  // Ensure sales column exists when feature is enabled
  const ensureSalesColumn = useMutation({
    mutationFn: async () => {
      if (!company?.id || !settings.enable_sales_column) return null;

      // Check if sales column exists
      const { data: existingColumn, error: fetchError } = await supabase
        .from("crm_stages")
        .select("id, name, position")
        .eq("company_id", company.id)
        .eq("name", SALES_COLUMN_NAME)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingColumn) {
        return existingColumn;
      }

      // Get max position to add column at the end
      const { data: stages, error: stagesError } = await supabase
        .from("crm_stages")
        .select("position")
        .eq("company_id", company.id)
        .order("position", { ascending: false })
        .limit(1);

      if (stagesError) throw stagesError;

      const maxPosition = stages && stages.length > 0 ? stages[0].position : -1;

      // Create sales column
      const { data: newColumn, error: insertError } = await supabase
        .from("crm_stages")
        .insert({
          company_id: company.id,
          name: SALES_COLUMN_NAME,
          position: maxPosition + 1,
        })
        .select("id, name, position")
        .single();

      if (insertError) throw insertError;

      return newColumn;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
    },
  });

  // Get sales column ID
  const getSalesColumnId = async (): Promise<string | null> => {
    if (!company?.id) return null;

    const { data, error } = await supabase
      .from("crm_stages")
      .select("id")
      .eq("company_id", company.id)
      .eq("name", SALES_COLUMN_NAME)
      .maybeSingle();

    if (error || !data) return null;
    return data.id;
  };

  // Move lead to sales column
  const moveLeadToSales = useMutation({
    mutationFn: async ({ 
      leadId, 
      productName,
      saleTotal,
      currentHistory = [],
      userEmail,
    }: { 
      leadId: string; 
      productName?: string;
      saleTotal: number;
      currentHistory?: any[];
      userEmail: string;
    }) => {
      if (!settings.auto_move_to_sales) return;

      const salesColumnId = await getSalesColumnId();
      if (!salesColumnId) {
        // Try to create it
        await ensureSalesColumn.mutateAsync();
        const newId = await getSalesColumnId();
        if (!newId) throw new Error("Coluna de vendas não encontrada");
      }

      const finalSalesColumnId = await getSalesColumnId();
      if (!finalSalesColumnId) return;

      const historyEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        user: userEmail,
        action: "Venda concluída",
        details: productName 
          ? `Venda de R$ ${saleTotal.toLocaleString("pt-BR")} - ${productName}`
          : `Venda concluída R$ ${saleTotal.toLocaleString("pt-BR")}`,
      };

      const updatedHistory = [historyEntry, ...currentHistory].slice(0, 200);

      const { error } = await supabase
        .from("leads")
        .update({
          status: finalSalesColumnId,
          history: updatedHistory,
        })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });

  return {
    ensureSalesColumn,
    moveLeadToSales,
    getSalesColumnId,
    isSalesColumnEnabled: settings.enable_sales_column,
    isAutoMoveEnabled: settings.auto_move_to_sales,
  };
}
