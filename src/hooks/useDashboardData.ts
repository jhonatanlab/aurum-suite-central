import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { startOfMonth, subDays, format, endOfDay, startOfDay } from "date-fns";
import type { DashboardFilters } from "@/components/dashboard/DashboardFilters";

export interface DashboardKPIs {
  monthRevenue: number;
  salesCount: number;
  averageTicket: number;
  newClients: number;
  productsSold: number;
  conversionRate: number;
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

export interface SourceData {
  source: string;
  count: number;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
}

export interface TopProduct {
  product_id: string;
  name: string;
  quantity: number;
  revenue: number;
}

export function useDashboardData(filters?: DashboardFilters) {
  const { company } = useCompany();
  const companyId = company?.id;

  const today = new Date();
  const defaultFrom = filters?.dateFrom ? format(startOfDay(filters.dateFrom), "yyyy-MM-dd'T'HH:mm:ss") : format(startOfMonth(today), "yyyy-MM-dd");
  const defaultTo = filters?.dateTo ? format(endOfDay(filters.dateTo), "yyyy-MM-dd'T'HH:mm:ss") : null;
  const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");

  const filterKey = JSON.stringify(filters ?? {});

  // Helper: apply date + seller filter to a sales query builder
  const applySalesFilters = (query: any) => {
    query = query.gte("created_at", defaultFrom);
    if (defaultTo) query = query.lte("created_at", defaultTo);
    if (filters?.sellerId) query = query.eq("seller_id", filters.sellerId);
    return query;
  };

  // Helper: apply source filter to a leads query builder
  const applyLeadFilters = (query: any) => {
    if (filters?.source) query = query.eq("source", filters.source);
    if (filters?.dateFrom) query = query.gte("created_at", format(startOfDay(filters.dateFrom), "yyyy-MM-dd'T'HH:mm:ss"));
    if (filters?.dateTo) query = query.lte("created_at", format(endOfDay(filters.dateTo), "yyyy-MM-dd'T'HH:mm:ss"));
    return query;
  };

  // KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["dashboard-kpis", companyId, filterKey],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!companyId) return { monthRevenue: 0, salesCount: 0, averageTicket: 0, newClients: 0, productsSold: 0, conversionRate: 0 };

      let salesQuery = supabase
        .from("sales")
        .select("id, total")
        .eq("company_id", companyId)
        .eq("status", "completed");
      salesQuery = applySalesFilters(salesQuery);

      const { data: sales } = await salesQuery;

      // If product filter, narrow sales to only those containing the product
      let filteredSales = sales ?? [];
      if (filters?.productId && filteredSales.length > 0) {
        const { data: matchingItems } = await supabase
          .from("sale_items")
          .select("sale_id")
          .eq("product_id", filters.productId)
          .in("sale_id", filteredSales.map((s) => s.id));
        const matchingSaleIds = new Set(matchingItems?.map((i) => i.sale_id) ?? []);
        filteredSales = filteredSales.filter((s) => matchingSaleIds.has(s.id));
      }

      const monthRevenue = filteredSales.reduce((sum, s) => sum + Number(s.total), 0);
      const salesCount = filteredSales.length;
      const averageTicket = salesCount > 0 ? monthRevenue / salesCount : 0;

      let leadsQuery = supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      leadsQuery = applyLeadFilters(leadsQuery);
      const { count: newClients } = await leadsQuery;

      const { count: totalLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);

      const { count: convertedLeads } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "won");

      const conversionRate = (totalLeads ?? 0) > 0 ? ((convertedLeads ?? 0) / (totalLeads ?? 0)) * 100 : 0;

      const { data: saleItems } = await supabase
        .from("sale_items")
        .select("quantity, sale_id")
        .in("sale_id", filteredSales.map((s) => s.id));

      const productsSold = saleItems?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

      return { monthRevenue, salesCount, averageTicket, newClients: newClients ?? 0, productsSold, conversionRate };
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Revenue chart
  const { data: revenueChart = [], isLoading: chartLoading } = useQuery({
    queryKey: ["dashboard-chart", companyId, filterKey],
    queryFn: async (): Promise<DailyRevenue[]> => {
      if (!companyId) return [];

      const chartFrom = filters?.dateFrom ? format(startOfDay(filters.dateFrom), "yyyy-MM-dd") : thirtyDaysAgo;
      const chartTo = filters?.dateTo ? format(endOfDay(filters.dateTo), "yyyy-MM-dd") : format(today, "yyyy-MM-dd");

      let query = supabase
        .from("sales")
        .select("id, total, created_at")
        .eq("company_id", companyId)
        .eq("status", "completed")
        .gte("created_at", chartFrom)
        .lte("created_at", chartTo + "T23:59:59")
        .order("created_at", { ascending: true });

      if (filters?.sellerId) query = query.eq("seller_id", filters.sellerId);
      const { data: sales } = await query;

      let filteredSales = sales ?? [];
      if (filters?.productId && filteredSales.length > 0) {
        const { data: matchingItems } = await supabase
          .from("sale_items")
          .select("sale_id")
          .eq("product_id", filters.productId)
          .in("sale_id", filteredSales.map((s) => s.id));
        const matchingSaleIds = new Set(matchingItems?.map((i) => i.sale_id) ?? []);
        filteredSales = filteredSales.filter((s) => matchingSaleIds.has(s.id));
      }

      const start = new Date(chartFrom);
      const end = new Date(chartTo);
      const dailyMap: Record<string, number> = {};
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dailyMap[format(d, "yyyy-MM-dd")] = 0;
      }

      filteredSales.forEach((s) => {
        const day = format(new Date(s.created_at!), "yyyy-MM-dd");
        if (dailyMap[day] !== undefined) dailyMap[day] += Number(s.total);
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

  // Lead sources
  const { data: leadSources = [], isLoading: sourcesLoading } = useQuery({
    queryKey: ["dashboard-lead-sources", companyId, filterKey],
    queryFn: async (): Promise<SourceData[]> => {
      if (!companyId) return [];
      let query = supabase
        .from("leads")
        .select("source")
        .eq("company_id", companyId);
      query = applyLeadFilters(query);
      const { data } = await query;

      const map: Record<string, number> = {};
      data?.forEach((l) => {
        const src = l.source || "Desconhecido";
        map[src] = (map[src] || 0) + 1;
      });
      return Object.entries(map)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Lead funnel
  const FUNNEL_ORDER = [
    { stage: "new", label: "Novos" },
    { stage: "contacted", label: "Contatados" },
    { stage: "qualified", label: "Qualificados" },
    { stage: "proposal", label: "Proposta" },
    { stage: "won", label: "Convertidos" },
  ];

  const { data: leadFunnel = [], isLoading: funnelLoading } = useQuery({
    queryKey: ["dashboard-lead-funnel", companyId, filterKey],
    queryFn: async (): Promise<FunnelStage[]> => {
      if (!companyId) return [];
      let query = supabase
        .from("leads")
        .select("status")
        .eq("company_id", companyId);
      query = applyLeadFilters(query);
      const { data } = await query;

      const map: Record<string, number> = {};
      data?.forEach((l) => {
        const st = l.status || "new";
        map[st] = (map[st] || 0) + 1;
      });

      return FUNNEL_ORDER.map((f) => ({
        ...f,
        count: map[f.stage] || 0,
      })).filter((f) => f.count > 0 || f.stage === "new");
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Top 5 products
  const { data: topProducts = [], isLoading: topProductsLoading } = useQuery({
    queryKey: ["dashboard-top-products", companyId, filterKey],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!companyId) return [];

      let salesQuery = supabase
        .from("sales")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "completed");
      salesQuery = applySalesFilters(salesQuery);
      const { data: sales } = await salesQuery;

      if (!sales?.length) return [];

      let itemsQuery = supabase
        .from("sale_items")
        .select("product_id, quantity, price, subtotal")
        .in("sale_id", sales.map((s) => s.id));

      if (filters?.productId) itemsQuery = itemsQuery.eq("product_id", filters.productId);
      const { data: items } = await itemsQuery;

      if (!items?.length) return [];

      const productMap: Record<string, { quantity: number; revenue: number }> = {};
      items.forEach((item) => {
        if (!productMap[item.product_id]) productMap[item.product_id] = { quantity: 0, revenue: 0 };
        productMap[item.product_id].quantity += item.quantity;
        productMap[item.product_id].revenue += Number(item.subtotal ?? item.price * item.quantity);
      });

      const productIds = Object.keys(productMap);
      const { data: products } = await supabase
        .from("products")
        .select("id, name")
        .in("id", productIds);

      const nameMap: Record<string, string> = {};
      products?.forEach((p) => { nameMap[p.id] = p.name; });

      return Object.entries(productMap)
        .map(([product_id, data]) => ({
          product_id,
          name: nameMap[product_id] || "Produto removido",
          quantity: data.quantity,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Recent sales
  const { data: recentSales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["dashboard-recent-sales", companyId, filterKey],
    queryFn: async (): Promise<RecentSale[]> => {
      if (!companyId) return [];
      let query = supabase
        .from("sales")
        .select("id, customer_name, total, status, created_at, payment_method")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (filters?.dateFrom) query = query.gte("created_at", format(startOfDay(filters.dateFrom), "yyyy-MM-dd'T'HH:mm:ss"));
      if (filters?.dateTo) query = query.lte("created_at", format(endOfDay(filters.dateTo), "yyyy-MM-dd'T'HH:mm:ss"));
      if (filters?.sellerId) query = query.eq("seller_id", filters.sellerId);

      const { data } = await query;
      return (data as RecentSale[]) ?? [];
    },
    enabled: !!companyId,
  });

  // Recent contacts
  const { data: recentContacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["dashboard-recent-contacts", companyId, filterKey],
    queryFn: async (): Promise<RecentContact[]> => {
      if (!companyId) return [];
      let query = supabase
        .from("leads")
        .select("id, name, phone, email, source, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(10);
      query = applyLeadFilters(query);
      const { data } = await query;
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
      return (data ?? [])
        .filter((p) => (p.stock ?? 0) <= (p.minimum_stock ?? 0) && (p.minimum_stock ?? 0) > 0)
        .slice(0, 10) as LowStockProduct[];
    },
    enabled: !!companyId,
  });

  return {
    kpis: kpis ?? { monthRevenue: 0, salesCount: 0, averageTicket: 0, newClients: 0, productsSold: 0, conversionRate: 0 },
    kpisLoading,
    revenueChart,
    chartLoading,
    leadSources,
    sourcesLoading,
    leadFunnel,
    funnelLoading,
    topProducts,
    topProductsLoading,
    recentSales,
    salesLoading,
    recentContacts,
    contactsLoading,
    lowStockProducts,
    stockLoading,
  };
}
