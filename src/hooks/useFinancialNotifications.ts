import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { addDays, isBefore, isToday, startOfDay } from "date-fns";

export interface FinancialNotification {
  id: string;
  type: "overdue" | "due_soon";
  title: string;
  description: string;
  value: number;
  date: string;
  transactionId: string;
}

interface UseFinancialNotificationsOptions {
  dueSoonDays?: number; // Default: 3 days
}

export function useFinancialNotifications(options: UseFinancialNotificationsOptions = {}) {
  const { company } = useCompany();
  const { dueSoonDays = 3 } = options;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_notifications", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, date, value, status, type")
        .eq("company_id", company.id)
        .in("status", ["pendente", "atrasado"])
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const notifications = useMemo<FinancialNotification[]>(() => {
    const today = startOfDay(new Date());
    const dueSoonLimit = addDays(today, dueSoonDays);
    const result: FinancialNotification[] = [];

    transactions.forEach((t) => {
      const transactionDate = startOfDay(new Date(t.date + "T00:00:00"));
      const typeLabel = t.type === "entrada" ? "receber" : "pagar";

      // Overdue accounts (date before today and not paid)
      if (isBefore(transactionDate, today) && !isToday(transactionDate)) {
        result.push({
          id: `overdue-${t.id}`,
          type: "overdue",
          title: "Conta atrasada",
          description: `${t.description} - ${typeLabel}`,
          value: t.value,
          date: t.date,
          transactionId: t.id,
        });
      }
      // Due soon (within X days, including today)
      else if (
        (isToday(transactionDate) || 
        (isBefore(transactionDate, dueSoonLimit) || transactionDate.getTime() === dueSoonLimit.getTime()))
      ) {
        result.push({
          id: `due-soon-${t.id}`,
          type: "due_soon",
          title: isToday(transactionDate) ? "Vence hoje" : "Vence em breve",
          description: `${t.description} - ${typeLabel}`,
          value: t.value,
          date: t.date,
          transactionId: t.id,
        });
      }
    });

    // Sort: overdue first, then by date
    return result.sort((a, b) => {
      if (a.type === "overdue" && b.type !== "overdue") return -1;
      if (a.type !== "overdue" && b.type === "overdue") return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [transactions, dueSoonDays]);

  const overdueCount = notifications.filter((n) => n.type === "overdue").length;
  const dueSoonCount = notifications.filter((n) => n.type === "due_soon").length;

  return {
    notifications,
    overdueCount,
    dueSoonCount,
    totalCount: notifications.length,
    isLoading,
  };
}
