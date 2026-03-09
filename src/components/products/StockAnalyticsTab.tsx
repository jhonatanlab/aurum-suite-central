import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, DollarSign, Package, BarChart3, AlertTriangle, RefreshCw } from "lucide-react";
import { format, subMonths } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface ProductWithSales {
  id: string;
  name: string;
  category: string | null;
  price: number;
  cost_price: number | null;
  stock: number;
  minimum_stock: number | null;
  promo_price: number | null;
  totalSold: number;
  revenue: number;
}

export function StockAnalyticsTab() {
  const { company } = useCompany();

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["stock-analytics-products", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, price, cost_price, stock, minimum_stock, promo_price")
        .eq("company_id", company!.id)
        .eq("status", "active")
        .eq("type", "simple");
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Get sales data from last 3 months for giro de estoque
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["stock-analytics-sales", company?.id],
    queryFn: async () => {
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();
      const { data, error } = await supabase
        .from("sale_items")
        .select("product_id, quantity, sale_id, sales!inner(company_id, status, created_at)")
        .eq("sales.company_id", company!.id)
        .eq("sales.status", "completed")
        .gte("sales.created_at", threeMonthsAgo);
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const analytics = useMemo(() => {
    if (!products) return null;

    // Aggregate sales by product
    const salesByProduct: Record<string, number> = {};
    (salesData || []).forEach((item: any) => {
      salesByProduct[item.product_id] = (salesByProduct[item.product_id] || 0) + item.quantity;
    });

    const enrichedProducts: ProductWithSales[] = products.map((p: any) => ({
      ...p,
      stock: p.stock || 0,
      totalSold: salesByProduct[p.id] || 0,
      revenue: (salesByProduct[p.id] || 0) * (p.promo_price || p.price),
    }));

    // MarkUp geral
    const totalCost = enrichedProducts.reduce((sum, p) => sum + (p.cost_price || 0) * p.stock, 0);
    const totalSellValue = enrichedProducts.reduce((sum, p) => sum + (p.promo_price || p.price) * p.stock, 0);
    const markupGeral = totalCost > 0 ? ((totalSellValue - totalCost) / totalCost) * 100 : 0;

    // Capital Imobilizado
    const capitalImobilizado = enrichedProducts.reduce((sum, p) => sum + (p.cost_price || 0) * p.stock, 0);

    // Curva ABC (by revenue)
    const sorted = [...enrichedProducts].sort((a, b) => b.revenue - a.revenue);
    const totalRevenue = sorted.reduce((s, p) => s + p.revenue, 0);
    let cumulative = 0;
    const abcProducts = sorted.map((p) => {
      cumulative += p.revenue;
      const pct = totalRevenue > 0 ? (cumulative / totalRevenue) * 100 : 0;
      let curve: "A" | "B" | "C" = "C";
      if (pct <= 80) curve = "A";
      else if (pct <= 95) curve = "B";
      return { ...p, curve, cumulativePct: pct };
    });

    // Níveis de reposição
    const critical = enrichedProducts.filter((p) => p.stock === 0).length;
    const low = enrichedProducts.filter((p) => p.stock > 0 && p.minimum_stock && p.stock <= p.minimum_stock).length;
    const ok = enrichedProducts.filter((p) => !p.minimum_stock || p.stock > (p.minimum_stock || 0)).length;

    // Giro de estoque (3 meses)
    const totalSoldQty = enrichedProducts.reduce((s, p) => s + p.totalSold, 0);
    const avgStock = enrichedProducts.reduce((s, p) => s + p.stock, 0);
    const giroEstoque = avgStock > 0 ? totalSoldQty / avgStock : 0;

    return {
      markupGeral,
      capitalImobilizado,
      abcProducts,
      critical,
      low,
      ok,
      giroEstoque,
      totalProducts: enrichedProducts.length,
    };
  }, [products, salesData]);

  const isLoading = productsLoading || salesLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card border-border">
              <CardContent className="pt-6"><Skeleton className="h-8 w-20" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const curveColor = (c: string) => {
    if (c === "A") return "bg-green-500/20 text-green-400 border-green-500/30";
    if (c === "B") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              MarkUp Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{analytics.markupGeral.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">sobre custo total</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Capital Imobilizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(analytics.capitalImobilizado)}</p>
            <p className="text-xs text-muted-foreground">qtd × preço de compra</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Giro de Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{analytics.giroEstoque.toFixed(2)}x</p>
            <p className="text-xs text-muted-foreground">últimos 3 meses</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Produtos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{analytics.totalProducts}</p>
            <p className="text-xs text-muted-foreground">no catálogo</p>
          </CardContent>
        </Card>
      </div>

      {/* Reposição Levels */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Níveis de Reposição
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-red-400">{analytics.critical}</p>
              <p className="text-sm text-muted-foreground mt-1">Sem Estoque</p>
            </div>
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{analytics.low}</p>
              <p className="text-sm text-muted-foreground mt-1">Estoque Baixo</p>
            </div>
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-3xl font-bold text-green-400">{analytics.ok}</p>
              <p className="text-sm text-muted-foreground mt-1">Normal</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Curva ABC */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Curva ABC (por receita dos últimos 3 meses)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-muted-foreground">Produto</TableHead>
                <TableHead className="text-muted-foreground">Categoria</TableHead>
                <TableHead className="text-muted-foreground text-center">Estoque</TableHead>
                <TableHead className="text-muted-foreground text-center">Vendidos (3m)</TableHead>
                <TableHead className="text-muted-foreground text-right">Receita</TableHead>
                <TableHead className="text-muted-foreground text-center">Curva</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.abcProducts.slice(0, 30).map((p) => (
                <TableRow key={p.id} className="border-border">
                  <TableCell className="font-medium text-foreground">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category || "-"}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.stock}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{p.totalSold}</TableCell>
                  <TableCell className="text-right text-primary font-semibold">{formatCurrency(p.revenue)}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={curveColor(p.curve)}>{p.curve}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
