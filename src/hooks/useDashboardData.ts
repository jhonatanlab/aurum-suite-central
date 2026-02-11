import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { startOfMonth, subDays, format } from "date-fns";

export interface DashboardKPIs {
  monthRevenue: number;
  salesCount: number;
  averageTicket: number;
  newClients: number;
  productsSold: number;
}

export interface DailyRevenue {
  date: string;
  label: string;
  value: number;
}

export interface RecentSale {
  id: string;
  customer_name: string | null;
  total: number;
  status: string;
  created_at: string;
  payment_method: string | null;
}

export interface RecentContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  created_at: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  stock: number | null;
  minimum_stock: number | null;
  price: number;
  category: string | null;
}

export function useDashboardData() {
  const { company } = useCompany();
  const companyId = company?.id;

  const today = new Date();
  const monthStart = format(startOfMonth(today), "yyyy-MM-dd");
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  // KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["dashboard-kpis", companyId],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!companyId) return { monthRevenue: 0, salesCount: 0, averageTicket: 0, newClients: 0, productsSold: 0 };

      // Sales this month
      const { data: sales } = await supabase
        .from("sales")
        .select("id, total")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("created_at", monthStart);

      const monthRevenue = sales?.reduce((sum, s) => sum + Number(s.total), 0) ?? 0;
      const salesCount = sales?.length ?? 0;
      const averageTicket = salesCount > 0 ? monthRevenue / salesCount : 0;

      // New clients this month
      const { count: newClients } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", monthStart);

      // Products sold this month
      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("quantity, sale_id")
        .in("sale_id", sales?.map((s) => s.id) ?? []);

      const productsSold = saleItems?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

      return {
        monthRevenue,
        salesCount,
        averageTicket,
        newClients: newClients ?? 0,
        productsSold,
      };
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Revenue chart - last 30 days
  const { data: revenueChart = [], isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard-chart", companyId],
    queryFn: async (): Promise<DailyRevenue[]> => {
      if (!companyId) return [];

      const { data: sales } = await supabase
        .from("sales")
        .select("total, created_at")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("created_at", thirtyDaysAgo)
        .order("created_at", { ascending: true });

      // Group by day
      const dailyMap: Record<string, number> = {};
      for (let i = 0; i <= 30; i++) {
        const d = format(subDays(today, 30 - i), "yyyy-MM-dd");
        dailyMap[d] = 0;
      }

      sales?.forEach((s) => {
        const day = format(new Date(s.created_at!), "yyyy-MM-dd");
        if (dailyMap[day] !== undefined) {
          dailyMap[day] += Number(s.total);
        }
      });

      return Object.entries(dailyMap).map(([date, value]) => ({
        date,
        label: format(new Date(date + "T12:00:00"), "dd/MM"),
        value,
      }));
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-recent-sales", companyId],
    queryFn: async (): Promise<RecentSale[]> => {
      if (!companyId) return [];

      const { data } = await supabase
        .from("sales")
        .select("id, customer_name, total, status, created_at, payment_method")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      return (data as RecentSale[]) ?? [];
    },
    enabled: !!companyId,
  });

  // Recent contacts
  const { data: recentContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["dashboard-recent-contacts", companyId],
    queryFn: async (): Promise<RecentContact[]> => {
      if (!companyId) return [];

      const { data } = await supabase
        .from("leads")
        .select("id, name, phone, email, source, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      return (data as RecentContact[]) ?? [];
    },
    enabled: !!companyId,
  });

  // Low stock products
  const { data: lowStockProducts = [], isLoading: stockLoading } = useQuery({
    queryKey: ["dashboard-low-stock", companyId],
    queryFn: async (): Promise<LowStockProduct[]> => {
      if (!companyId) return [];

      const { data } = await supabase
        .from("products")
        .select("id, name, stock, minimum_stock, price, category")
        .eq("company_id", companyId)
        .eq("status", "active")
        .order("stock", { ascending: true })
        .limit(20);

      // Filter where stock <= minimum_stock
      return (data ?? [])
        .filter((p) => (p.stock ?? 0) <= (p.minimum_stock ?? 0) && (p.minimum_stock ?? 0) > 0)
        .slice(0, 10) as LowStockProduct[];
    },
    enabled: !!companyId,
  });

  return {
    kpis: kpis ?? { monthRevenue: 0, salesCount: 0, averageTicket: 0, newClients: 0, productsSold: 0 },
    kpisLoading,
    revenueChart,
    chartLoading,
    recentSales,
    salesLoading,
    recentContacts,
    contactsLoading,
    lowStockProducts,
    stockLoading,
  };
}
