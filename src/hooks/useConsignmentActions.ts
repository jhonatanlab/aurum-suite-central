import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { toast } from "sonner";

interface ReturnItem {
  product_id: string;
  quantity: number;
  item_ids: string[];
}

interface ReturnPayload {
  reseller_id: string;
  items: ReturnItem[];
  observation: string;
}

interface SellItem {
  product_id: string;
  quantity: number;
  sale_value: number;
  item_ids: string[];
}

interface SellPayload {
  reseller_id: string;
  items: SellItem[];
  observation: string;
  commission_type: string;
  commission_value: number;
}

interface ClosingPayload {
  reseller_id: string;
  reseller_name: string;
  commission_type: string;
  commission_value: number;
}

export function useConsignmentActions(resellerId: string) {
  const { company } = useCompany();
  const queryClient = useQueryClient();

  // Return items mutation
  const returnItems = useMutation({
    mutationFn: async (payload: ReturnPayload) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      let totalReturned = 0;

      for (const item of payload.items) {
        // Update consignment items status
        const { error: updateError } = await supabase
          .from("consignment_items")
          .update({
            status: "returned",
            returned_at: new Date().toISOString(),
            returned_by: "Sistema",
            observation: payload.observation || null,
          })
          .in("id", item.item_ids);

        if (updateError) throw updateError;

        // Return stock to products
        const { data: productData } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.product_id)
          .single();

        const currentStock = productData?.stock ?? 0;
        const newStock = currentStock + item.quantity;

        await supabase
          .from("products")
          .update({ stock: newStock })
          .eq("id", item.product_id);

        totalReturned += item.quantity;
      }

      // Add history entry
      await supabase.from("reseller_history").insert({
        reseller_id: payload.reseller_id,
        action: "consignment_returned",
        description: `${totalReturned} peça(s) devolvida(s) ao estoque${payload.observation ? `: ${payload.observation}` : ""}`,
        created_by: "Sistema",
      });

      return { count: totalReturned };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consignment-items", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${data.count} peça(s) devolvida(s) com sucesso`);
    },
    onError: (error: Error) => {
      toast.error("Erro ao devolver peças: " + error.message);
    },
  });

  // Sell items mutation
  const sellItems = useMutation({
    mutationFn: async (payload: SellPayload) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      let totalSold = 0;
      let totalValue = 0;
      let totalCommission = 0;

      for (const item of payload.items) {
        // Calculate commission per item
        let commissionPerUnit = 0;
        if (payload.commission_type === "percent") {
          commissionPerUnit = item.sale_value * (payload.commission_value / 100);
        } else {
          commissionPerUnit = payload.commission_value;
        }

        // Update each consignment item
        for (const itemId of item.item_ids) {
          const { error: updateError } = await supabase
            .from("consignment_items")
            .update({
              status: "sold",
              sold_at: new Date().toISOString(),
              sale_value: item.sale_value,
              commission_amount: commissionPerUnit,
              observation: payload.observation || null,
            })
            .eq("id", itemId);

          if (updateError) throw updateError;
        }

        totalSold += item.quantity;
        totalValue += item.sale_value * item.quantity;
        totalCommission += commissionPerUnit * item.quantity;
      }

      // Add history entry
      await supabase.from("reseller_history").insert({
        reseller_id: payload.reseller_id,
        action: "consignment_sold",
        description: `${totalSold} peça(s) vendida(s) - Total: R$ ${totalValue.toFixed(2)} | Comissão: R$ ${totalCommission.toFixed(2)}`,
        created_by: "Sistema",
      });

      // Create financial transaction for the sale income
      await supabase.from("financial_transactions").insert({
        company_id: company.id,
        date: new Date().toISOString().split("T")[0],
        description: `Venda consignação - ${totalSold} peça(s)`,
        type: "income",
        value: totalValue - totalCommission,
        status: "paid",
        paid_at: new Date().toISOString(),
        origin: "consignment",
        method: "cash",
      });

      return { count: totalSold, value: totalValue, commission: totalCommission };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consignment-items", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      toast.success(
        `${data.count} peça(s) vendida(s) - Lucro: R$ ${(data.value - data.commission).toFixed(2)}`
      );
    },
    onError: (error: Error) => {
      toast.error("Erro ao registrar vendas: " + error.message);
    },
  });

  // Create closing mutation
  const createClosing = useMutation({
    mutationFn: async (payload: ClosingPayload) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      // Get all items for this reseller
      const { data: allItems, error: fetchError } = await supabase
        .from("consignment_items")
        .select("*")
        .eq("company_id", company.id)
        .eq("reseller_id", payload.reseller_id);

      if (fetchError) throw fetchError;

      type ConsignmentItemRow = typeof allItems extends (infer T)[] | null ? T : never;
      
      const soldItems = (allItems?.filter((i) => i.status === "sold" && !(i as any).closing_id) || []) as ConsignmentItemRow[];
      const returnedItems = (allItems?.filter((i) => i.status === "returned" && !(i as any).closing_id) || []) as ConsignmentItemRow[];
      const pendingItems = (allItems?.filter((i) => i.status === "with_reseller") || []) as ConsignmentItemRow[];

      if (soldItems.length === 0 && returnedItems.length === 0) {
        throw new Error("Nenhuma atividade para fechar");
      }

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      const getUnitBaseValue = (item: ConsignmentItemRow) =>
        Number((item as any).sale_value ?? item.consignment_value);

      const getUnitCommission = (item: ConsignmentItemRow) => {
        const stored = Number((item as any).commission_amount ?? 0);
        if (stored > 0) return stored;

        const base = getUnitBaseValue(item);
        if (payload.commission_type === "percent") {
          return base * (payload.commission_value / 100);
        }

        return Number(payload.commission_value ?? 0);
      };

      const closableItems = [...soldItems, ...returnedItems];
      const periodStart = closableItems.length
        ? formatDate(
            new Date(
              Math.min(
                ...closableItems.map((i) => new Date((i as any).sent_at).getTime())
              )
            )
          )
        : formatDate(new Date());
      const periodEnd = formatDate(new Date());

      const totalSoldValue = soldItems.reduce(
        (acc, item) => acc + getUnitBaseValue(item),
        0
      );

      const totalCommission = soldItems.reduce(
        (acc, item) => acc + getUnitCommission(item),
        0
      );

      // Create closing record
      const { data: closing, error: closingError } = await supabase
        .from("consignment_closings" as any)
        .insert({
          company_id: company.id,
          reseller_id: payload.reseller_id,
          closed_by: "Sistema",
          period_start: periodStart,
          period_end: periodEnd,
          total_items: soldItems.length + returnedItems.length + pendingItems.length,
          total_sold: soldItems.length,
          total_returned: returnedItems.length,
          total_pending: pendingItems.length,
          total_sold_value: totalSoldValue,
          total_commission: totalCommission,
          net_profit: totalSoldValue - totalCommission,
          commission_type: payload.commission_type,
          commission_value: payload.commission_value,
        })
        .select()
        .single();

      if (closingError) throw closingError;

      // Update sold/returned items with closing_id
      const itemsToUpdate = [...soldItems, ...returnedItems].map((i) => i.id);
      if (itemsToUpdate.length > 0) {
        await supabase
          .from("consignment_items")
          .update({ closing_id: (closing as any).id } as any)
          .in("id", itemsToUpdate);
      }

      // Add history entry
      await supabase.from("reseller_history").insert({
        reseller_id: payload.reseller_id,
        action: "closing_created",
        description: `Fechamento gerado - ${soldItems.length} vendidas, ${returnedItems.length} devolvidas | Lucro: R$ ${(totalSoldValue - totalCommission).toFixed(2)}`,
        created_by: "Sistema",
      });

      return {
        closing,
        soldCount: soldItems.length,
        returnedCount: returnedItems.length,
        netProfit: totalSoldValue - totalCommission,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["consignment-items", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["consignment-closings", resellerId] });
      queryClient.invalidateQueries({ queryKey: ["reseller-history", resellerId] });
      toast.success(
        `Fechamento criado - Lucro líquido: R$ ${data.netProfit.toFixed(2)}`
      );
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar fechamento: " + error.message);
    },
  });

  return {
    returnItems,
    sellItems,
    createClosing,
  };
}
