import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { toast } from "sonner";

export interface ResellerPayment {
  id: string;
  company_id: string;
  reseller_id: string;
  closing_id: string;
  amount: number;
  payment_method: string | null;
  paid_at: string;
  observation: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ClosingWithBalance {
  id: string;
  closed_at: string;
  period_start: string;
  period_end: string;
  total_sold_value: number;
  total_commission: number;
  paid_amount: number;
  pending_amount: number;
}

export interface PaymentFormData {
  closing_id: string;
  amount: number;
  payment_method: string;
  observation?: string;
}

export function useResellerPayments(resellerId: string) {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  // Fetch all payments for this reseller
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["reseller-payments", resellerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_payments")
        .select("*")
        .eq("reseller_id", resellerId)
        .order("paid_at", { ascending: false });

      if (error) throw error;
      return data as ResellerPayment[];
    },
    enabled: !!resellerId,
  });

  // Fetch closings with their payment status
  const { data: closingsWithBalance, isLoading: isLoadingClosings } = useQuery({
    queryKey: ["reseller-closings-balance", resellerId],
    queryFn: async () => {
      // Get all closings
      const { data: closings, error: closingsError } = await supabase
        .from("consignment_closings")
        .select("*")
        .eq("reseller_id", resellerId)
        .order("closed_at", { ascending: false });

      if (closingsError) throw closingsError;

      // Get all payments for this reseller
      const { data: allPayments, error: paymentsError } = await supabase
        .from("reseller_payments")
        .select("closing_id, amount")
        .eq("reseller_id", resellerId);

      if (paymentsError) throw paymentsError;

      // Calculate paid amount per closing
      const paidByClosing = (allPayments || []).reduce((acc, payment) => {
        acc[payment.closing_id] = (acc[payment.closing_id] || 0) + Number(payment.amount);
        return acc;
      }, {} as Record<string, number>);

      // Map closings with balance info
      return (closings || []).map((closing) => {
        const paidAmount = paidByClosing[closing.id] || 0;
        const pendingAmount = Number(closing.total_commission) - paidAmount;

        return {
          id: closing.id,
          closed_at: closing.closed_at,
          period_start: closing.period_start,
          period_end: closing.period_end,
          total_sold_value: Number(closing.total_sold_value),
          total_commission: Number(closing.total_commission),
          paid_amount: paidAmount,
          pending_amount: Math.max(0, pendingAmount),
        } as ClosingWithBalance;
      });
    },
    enabled: !!resellerId,
  });

  // Calculate totals
  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const totalPending = closingsWithBalance?.reduce((sum, c) => sum + c.pending_amount, 0) || 0;
  const pendingClosings = closingsWithBalance?.filter((c) => c.pending_amount > 0) || [];

  // Create payment mutation
  const createPayment = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      const { data: user } = await supabase.auth.getUser();

      // Insert payment
      const { error: paymentError } = await supabase.from("reseller_payments").insert({
        company_id: company.id,
        reseller_id: resellerId,
        closing_id: data.closing_id,
        amount: data.amount,
        payment_method: data.payment_method,
        observation: data.observation || null,
        created_by: user?.user?.email || null,
      });

      if (paymentError) throw paymentError;

      // Register in reseller history
      await supabase.from("reseller_history").insert({
        reseller_id: resellerId,
        action: "payment",
        description: `Pagamento de R$ ${data.amount.toFixed(2).replace(".", ",")} registrado via ${data.payment_method}`,
        created_by: user?.user?.email || null,
      });

      // Create financial transaction (expense)
      await supabase.from("financial_transactions").insert({
        company_id: company.id,
        type: "expense",
        description: `Comissão revendedor - Pagamento`,
        value: data.amount,
        date: new Date().toISOString().split("T")[0],
        status: "paid",
        paid_at: new Date().toISOString(),
        origin: "reseller_commission",
        method: data.payment_method,
        reference_id: resellerId,
      });

      return true;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["reseller-payments", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-closings-balance", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
      toast.error("Erro ao registrar pagamento");
    },
  });

  return {
    payments,
    isLoadingPayments,
    closingsWithBalance,
    isLoadingClosings,
    totalPaid,
    totalPending,
    pendingClosings,
    createPayment,
  };
}
