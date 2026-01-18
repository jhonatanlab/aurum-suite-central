import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface ResellerReportData {
  resellerId: string;
  resellerName: string;
  totalSold: number;
  totalSoldValue: number;
  totalCommission: number;
  totalPaid: number;
  pendingBalance: number;
  itemsWithReseller: number;
  totalReturned: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  resellerId?: string;
}

export interface ConsolidatedReport {
  totalSoldValue: number;
  totalCommission: number;
  totalPaid: number;
  totalPending: number;
  totalResellers: number;
  activeResellers: number;
  totalItemsWithResellers: number;
}

export function useResellerReports(filters?: ReportFilters) {
  const { company } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["reseller-reports", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return { individual: [], consolidated: null };

      // Fetch all resellers
      const { data: resellers, error: resellersError } = await supabase
        .from("resellers")
        .select("id, name, status")
        .eq("company_id", company.id);

      if (resellersError) throw resellersError;

      // If filtering by specific reseller
      const relevantResellers = filters?.resellerId
        ? resellers?.filter((r) => r.id === filters.resellerId)
        : resellers;

      // Build date filter conditions
      const startDate = filters?.startDate;
      const endDate = filters?.endDate;

      // Fetch closings with date filter
      let closingsQuery = supabase
        .from("consignment_closings")
        .select("*")
        .eq("company_id", company.id);

      if (startDate) {
        closingsQuery = closingsQuery.gte("closed_at", startDate);
      }
      if (endDate) {
        closingsQuery = closingsQuery.lte("closed_at", endDate + "T23:59:59");
      }

      const { data: closings, error: closingsError } = await closingsQuery;
      if (closingsError) throw closingsError;

      // Fetch payments with date filter
      let paymentsQuery = supabase
        .from("reseller_payments")
        .select("*")
        .eq("company_id", company.id);

      if (startDate) {
        paymentsQuery = paymentsQuery.gte("paid_at", startDate);
      }
      if (endDate) {
        paymentsQuery = paymentsQuery.lte("paid_at", endDate + "T23:59:59");
      }

      const { data: payments, error: paymentsError } = await paymentsQuery;
      if (paymentsError) throw paymentsError;

      // Fetch current consignment items
      const { data: consignmentItems, error: itemsError } = await supabase
        .from("consignment_items")
        .select("reseller_id, status")
        .eq("company_id", company.id)
        .is("closing_id", null);

      if (itemsError) throw itemsError;

      // Calculate per-reseller data
      const individual: ResellerReportData[] = (relevantResellers || []).map(
        (reseller) => {
          const resellerClosings = (closings || []).filter(
            (c) => c.reseller_id === reseller.id
          );
          const resellerPayments = (payments || []).filter(
            (p) => p.reseller_id === reseller.id
          );
          const resellerItems = (consignmentItems || []).filter(
            (i) => i.reseller_id === reseller.id
          );

          const totalSold = resellerClosings.reduce(
            (sum, c) => sum + Number(c.total_sold),
            0
          );
          const totalSoldValue = resellerClosings.reduce(
            (sum, c) => sum + Number(c.total_sold_value),
            0
          );
          const totalCommission = resellerClosings.reduce(
            (sum, c) => sum + Number(c.total_commission),
            0
          );
          const totalPaid = resellerPayments.reduce(
            (sum, p) => sum + Number(p.amount),
            0
          );
          const totalReturned = resellerClosings.reduce(
            (sum, c) => sum + Number(c.total_returned),
            0
          );
          const itemsWithReseller = resellerItems.filter(
            (i) => i.status === "with_reseller"
          ).length;

          return {
            resellerId: reseller.id,
            resellerName: reseller.name,
            totalSold,
            totalSoldValue,
            totalCommission,
            totalPaid,
            pendingBalance: Math.max(0, totalCommission - totalPaid),
            itemsWithReseller,
            totalReturned,
          };
        }
      );

      // Calculate consolidated data
      const consolidated: ConsolidatedReport = {
        totalSoldValue: individual.reduce((sum, r) => sum + r.totalSoldValue, 0),
        totalCommission: individual.reduce((sum, r) => sum + r.totalCommission, 0),
        totalPaid: individual.reduce((sum, r) => sum + r.totalPaid, 0),
        totalPending: individual.reduce((sum, r) => sum + r.pendingBalance, 0),
        totalResellers: resellers?.length || 0,
        activeResellers:
          resellers?.filter((r) => r.status === "active").length || 0,
        totalItemsWithResellers: individual.reduce(
          (sum, r) => sum + r.itemsWithReseller,
          0
        ),
      };

      return { individual, consolidated };
    },
    enabled: !!company?.id,
  });

  return {
    individual: data?.individual || [],
    consolidated: data?.consolidated || null,
    isLoading,
  };
}
