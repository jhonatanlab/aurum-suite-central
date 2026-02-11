import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardData } from "@/hooks/useDashboardData";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Concluída", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  pending: { label: "Pendente", variant: "secondary" },
};

export default function Dashboard() {
  const {
    kpis,
    kpisLoading,
    revenueChart,
    chartLoading,
    recentSales,
    salesLoading,
    recentContacts,
    contactsLoading,
    lowStockProducts,
    stockLoading,
  } = useDashboardData();

  const stats = [
    { title: "Receita do Mês", value: formatCurrency(kpis.monthRevenue), icon: DollarSign },
    { title: "Vendas", value: kpis.salesCount.toString(), icon: ShoppingCart },
    { title: "Ticket Médio", value: formatCurrency(kpis.averageTicket), icon: TrendingUp },
    { title: "Novos Clientes", value: kpis.newClients.toString(), icon: Users },
    { title: "Produtos Vendidos", value: kpis.productsSold.toString(), icon: Package },
  ];

  return (
    <AppLayout title="Dashboard">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="bg-card border-border animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-8 w-8 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
              </CardHeader>
              <CardContent>
                {kpisLoading ? (
                  <Skeleton className="h-7 w-24" />
                ) : (
                  <div className="text-xl font-bold text-foreground">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card border-border mb-6 animate-fade-in" style={{ animationDelay: "400ms" }}>
        <CardHeader>
          <CardTitle className="text-foreground text-base">Receita — Últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          {chartLoading ? (
            <Skeleton className="h-[280px] w-full rounded-xl" />
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="label" stroke="hsl(0, 0%, 60%)" fontSize={11} interval="preserveStartEnd" />
                  <YAxis
                    stroke="hsl(0, 0%, 60%)"
                    fontSize={11}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 12%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "0.75rem",
                    }}
                    labelStyle={{ color: "hsl(40, 20%, 95%)" }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(40, 45%, 55%)"
                    strokeWidth={2}
                    fill="url(#goldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Sales */}
        <Card className="bg-card border-border animate-fade-in lg:col-span-1" style={{ animationDelay: "500ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-gold" />
              Últimas Vendas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {salesLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : recentSales.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhuma venda registrada</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {sale.customer_name || "Cliente não informado"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.created_at!), "dd/MM/yy HH:mm")}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-semibold text-gold">{formatCurrency(sale.total)}</p>
                      <Badge variant={statusLabels[sale.status]?.variant ?? "outline"} className="text-[10px] px-1.5">
                        {statusLabels[sale.status]?.label ?? sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Contacts */}
        <Card className="bg-card border-border animate-fade-in lg:col-span-1" style={{ animationDelay: "600ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-gold" />
              Contatos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {contactsLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : recentContacts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Nenhum contato adicionado</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {recentContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.phone || contact.email || "—"}
                      </p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(contact.created_at!), "dd/MM/yy")}
                      </p>
                      {contact.source && (
                        <Badge variant="outline" className="text-[10px] px-1.5">{contact.source}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card className="bg-card border-border animate-fade-in lg:col-span-1" style={{ animationDelay: "700ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground text-base flex items-center gap-2">
              <Package className="h-4 w-4 text-gold" />
              Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stockLoading ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">Estoque OK ✓</p>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                      {product.category && (
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      )}
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <p className="text-sm font-semibold text-destructive">
                        {product.stock ?? 0} / {product.minimum_stock ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(product.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
