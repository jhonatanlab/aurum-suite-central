import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export type StatementEventType = "consignment" | "sale" | "return" | "closing" | "payment";

export interface StatementEvent {
  id: string;
  date: string;
  type: StatementEventType;
  reference: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
}

interface StatementFilters {
  startDate?: string;
  endDate?: string;
  eventType?: StatementEventType | "all";
}

export function useResellerStatement(resellerId: string, filters?: StatementFilters) {
  const { company } = useCompany();

  const { data: statement = [], isLoading } = useQuery({
    queryKey: ["reseller-statement", resellerId, filters],
    queryFn: async () => {
      if (!company?.id || !resellerId) return [];

      const events: Omit<StatementEvent, "balance">[] = [];

      // 1. Fetch consignment items
      let consignmentQuery = supabase
        .from("consignment_items")
        .select(`
          id,
          sent_at,
          consignment_value,
          status,
          sold_at,
          returned_at,
          sale_value,
          products:product_id (name)
        `)
        .eq("reseller_id", resellerId)
        .eq("company_id", company.id);

      const { data: consignments, error: consignmentError } = await consignmentQuery;
      if (consignmentError) throw consignmentError;

      // Process consignments
      for (const item of consignments || []) {
        const productName = (item.products as any)?.name || "Produto";

        // Consignment sent event
        events.push({
          id: `consignment-${item.id}`,
          date: item.sent_at,
          type: "consignment",
          reference: item.id.slice(0, 8).toUpperCase(),
          description: `Consignação: ${productName}`,
          credit: 0,
          debit: Number(item.consignment_value),
        });

        // Sale event
        if (item.status === "sold" && item.sold_at) {
          events.push({
            id: `sale-${item.id}`,
            date: item.sold_at,
            type: "sale",
            reference: item.id.slice(0, 8).toUpperCase(),
            description: `Venda: ${productName}`,
            credit: Number(item.sale_value || item.consignment_value),
            debit: 0,
          });
        }

        // Return event
        if (item.status === "returned" && item.returned_at) {
          events.push({
            id: `return-${item.id}`,
            date: item.returned_at,
            type: "return",
            reference: item.id.slice(0, 8).toUpperCase(),
            description: `Devolução: ${productName}`,
            credit: Number(item.consignment_value),
            debit: 0,
          });
        }
      }

      // 2. Fetch closings
      const { data: closings, error: closingsError } = await supabase
        .from("consignment_closings")
        .select("*")
        .eq("reseller_id", resellerId)
        .eq("company_id", company.id);

      if (closingsError) throw closingsError;

      for (const closing of closings || []) {
        events.push({
          id: `closing-${closing.id}`,
          date: closing.closed_at,
          type: "closing",
          reference: closing.id.slice(0, 8).toUpperCase(),
          description: `Fechamento período ${new Date(closing.period_start).toLocaleDateString("pt-BR")} - ${new Date(closing.period_end).toLocaleDateString("pt-BR")}`,
          credit: 0,
          debit: Number(closing.total_commission),
        });
      }

      // 3. Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from("reseller_payments")
        .select("*")
        .eq("reseller_id", resellerId)
        .eq("company_id", company.id);

      if (paymentsError) throw paymentsError;

      for (const payment of payments || []) {
        events.push({
          id: `payment-${payment.id}`,
          date: payment.paid_at || payment.created_at || new Date().toISOString(),
          type: "payment",
          reference: payment.id.slice(0, 8).toUpperCase(),
          description: `Pagamento via ${payment.payment_method || "N/A"}${payment.observation ? ` - ${payment.observation}` : ""}`,
          credit: Number(payment.amount),
          debit: 0,
        });
      }

      // Apply filters
      let filteredEvents = [...events];

      if (filters?.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        filteredEvents = filteredEvents.filter(
          (e) => new Date(e.date) >= start
        );
      }

      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        filteredEvents = filteredEvents.filter((e) => new Date(e.date) <= end);
      }

      if (filters?.eventType && filters.eventType !== "all") {
        filteredEvents = filteredEvents.filter(
          (e) => e.type === filters.eventType
        );
      }

      // Sort chronologically (oldest first for balance calculation)
      filteredEvents.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate running balance
      let runningBalance = 0;
      const statementWithBalance: StatementEvent[] = filteredEvents.map(
        (event) => {
          // Debit increases what reseller owes, credit decreases
          runningBalance = runningBalance - event.credit + event.debit;
          return {
            ...event,
            balance: runningBalance,
          };
        }
      );

      // Return in reverse chronological order for display
      return statementWithBalance.reverse();
    },
    enabled: !!company?.id && !!resellerId,
  });

  // Calculate totals
  const totals = {
    totalCredits: statement.reduce((sum, e) => sum + e.credit, 0),
    totalDebits: statement.reduce((sum, e) => sum + e.debit, 0),
    currentBalance: statement[0]?.balance || 0,
  };

  return {
    statement,
    isLoading,
    totals,
  };
}
