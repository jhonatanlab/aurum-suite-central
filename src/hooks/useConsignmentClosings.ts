import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export interface ConsignmentClosing {
  id: string;
  reseller_id: string;
  closed_at: string;
  closed_by: string | null;
  period_start: string;
  period_end: string;
  total_items: number;
  total_sold: number;
  total_returned: number;
  total_pending: number;
  total_sold_value: number;
  total_commission: number;
  net_profit: number;
  commission_type: string;
  commission_value: number;
  observation: string | null;
  created_at: string;
}

export function useConsignmentClosings(resellerId: string) {
  const { company } = useCompany();

  const { data: closings = [], isLoading } = useQuery({
    queryKey: ["consignment-closings", resellerId],
    queryFn: async () => {
      if (!company?.id || !resellerId) return [];

      const { data, error } = await supabase
        .from("consignment_closings" as any)
        .select("*")
        .eq("company_id", company.id)
        .eq("reseller_id", resellerId)
        .order("closed_at", { ascending: false });

      if (error) throw error;

      return (data as unknown as ConsignmentClosing[]) || [];
    },
    enabled: !!company?.id && !!resellerId,
  });

  return {
    closings,
    isLoading,
  };
}
