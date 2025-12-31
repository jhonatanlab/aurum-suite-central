import { useCallback, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCrmSettings } from "@/hooks/useCrmSettings";

const SALES_COLUMN_NAME = "Vendas";

type SalesStage = {
  id: string;
  name: string;
  position: number;
};

// Shared lock across all hook instances (avoids double creation in StrictMode / multiple mounts)
const ensureSalesColumnInFlightByCompany = new Map<
  string,
  Promise<SalesStage | null>
>();

function pickKeepStage(stages: SalesStage[]): SalesStage {
  // Deterministic: highest position first; tie-breaker by smallest id
  return [...stages].sort((a, b) => {
    if (a.position !== b.position) return b.position - a.position;
    return a.id.localeCompare(b.id);
  })[0];
}

async function getMaxPosition(companyId: string): Promise<number> {
  const { data, error } = await supabase
    .from("crm_stages")
    .select("position")
    .eq("company_id", companyId)
    .order("position", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0].position : -1;
}

export function useSalesColumnV2() {
  const { company } = useCompany();
  const { settings } = useCrmSettings();
  const queryClient = useQueryClient();
  const isCreatingRef = useRef(false);

  const ensureSalesColumn = useMutation({
    mutationFn: async () => {
      if (!company?.id || !settings.enable_sales_column) return null;

      const companyId = company.id;

      const existingPromise = ensureSalesColumnInFlightByCompany.get(companyId);
      if (existingPromise) return await existingPromise;

      const promise = (async (): Promise<SalesStage | null> => {
        // Prevent concurrent executions inside the same hook instance
        if (isCreatingRef.current) return null;
        isCreatingRef.current = true;

        try {
          // Fetch all "Vendas" columns (if duplicates exist, we'll consolidate)
          const { data: salesStages, error: salesError } = await supabase
            .from("crm_stages")
            .select("id, name, position")
            .eq("company_id", companyId)
            .eq("name", SALES_COLUMN_NAME)
            .order("position", { ascending: false });

          if (salesError) throw salesError;

          const maxPosition = await getMaxPosition(companyId);

          let keep: SalesStage | null = null;
          const rows = (salesStages ?? []) as SalesStage[];

          if (rows.length === 0) {
            // Create at the end of the funnel
            const { data: created, error: insertError } = await supabase
              .from("crm_stages")
              .insert({
                company_id: companyId,
                name: SALES_COLUMN_NAME,
                position: maxPosition + 1,
              })
              .select("id, name, position")
              .single();

            if (insertError) throw insertError;
            keep = created as SalesStage;
          } else {
            keep = pickKeepStage(rows);

            // If duplicates exist, move leads to the kept stage and delete extras
            const extras = rows.filter((s) => s.id !== keep!.id);
            if (extras.length > 0) {
              const extraIds = extras.map((s) => s.id);

              const { error: leadsUpdateError } = await supabase
                .from("leads")
                .update({ status: keep.id })
                .eq("company_id", companyId)
                .in("status", extraIds);

              if (leadsUpdateError) throw leadsUpdateError;

              const { error: deleteError } = await supabase
                .from("crm_stages")
                .delete()
                .eq("company_id", companyId)
                .in("id", extraIds);

              if (deleteError) throw deleteError;
            }

            // Ensure kept stage is positioned at the end
            if (keep.position < maxPosition) {
              const { data: updated, error: updateError } = await supabase
                .from("crm_stages")
                .update({ position: maxPosition + 1 })
                .eq("id", keep.id)
                .select("id, name, position")
                .single();

              if (updateError) throw updateError;
              keep = updated as SalesStage;
            }
          }

          return keep;
        } finally {
          isCreatingRef.current = false;
        }
      })();

      ensureSalesColumnInFlightByCompany.set(companyId, promise);
      try {
        return await promise;
      } finally {
        ensureSalesColumnInFlightByCompany.delete(companyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
    },
  });

  const getSalesColumnId = useCallback(async (): Promise<string | null> => {
    if (!company?.id) return null;

    const { data, error } = await supabase
      .from("crm_stages")
      .select("id, position")
      .eq("company_id", company.id)
      .eq("name", SALES_COLUMN_NAME)
      .order("position", { ascending: false })
      .limit(1);

    if (error) return null;
    return data && data.length > 0 ? data[0].id : null;
  }, [company?.id]);

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

      let salesColumnId = await getSalesColumnId();
      if (!salesColumnId) {
        await ensureSalesColumn.mutateAsync();
        salesColumnId = await getSalesColumnId();
        if (!salesColumnId) throw new Error("Coluna de vendas não encontrada");
      }

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
          status: salesColumnId,
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
