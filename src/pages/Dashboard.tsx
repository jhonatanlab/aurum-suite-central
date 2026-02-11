import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  BarChart3,
  Inbox,
  PackageCheck,
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

function KpiSkeleton() {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-28 mb-1" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-[200px]">{description}</p>
    </div>
  );
}

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

  const kpiCards = [
    {
      title: "Receita do Mês",
      value: formatCurrency(kpis.monthRevenue),
      icon: DollarSign,
      accent: true,
    },
    {
      title: "Vendas",
      value: kpis.salesCount.toString(),
      icon: ShoppingCart,
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(kpis.averageTicket),
      icon: TrendingUp,
    },
    {
      title: "Novos Clientes",
      value: kpis.newClients.toString(),
      icon: Users,
    },
    {
      title: "Produtos Vendidos",
      value: kpis.productsSold.toString(),
      icon: Package,
    },
  ];

  return (
    <AppLayout title="Dashboard">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
        {kpiCards.map((kpi, index) => {
          const Icon = kpi.icon;

          if (kpisLoading) return <KpiSkeleton key={index} />;

          return (
            <Card
              key={kpi.title}
              className={`bg-card border-border card-hover animate-fade-in group relative overflow-hidden ${
                kpi.accent ? "border-[hsl(var(--gold)/0.2)]" : ""
              }`}
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Subtle gold accent line for primary KPI */}
              {kpi.accent && (
                <div className="absolute top-0 left-0 right-0 h-[2px] gold-gradient opacity-60" />
              )}
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  {kpi.title}
                </CardTitle>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                    kpi.accent
                      ? "bg-[hsl(var(--gold)/0.12)] group-hover:bg-[hsl(var(--gold)/0.2)]"
                      : "bg-secondary group-hover:bg-secondary/80"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${kpi.accent ? "text-gold" : "text-gold"}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-xl font-bold tracking-tight ${
                    kpi.accent ? "gold-text" : "text-foreground"
                  }`}
                >
                  {kpi.value}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Este mês</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card
        className="bg-card border-border mb-6 animate-fade-in overflow-hidden"
        style={{ animationDelay: "420ms" }}
      >
        <CardHeader className="flex flex-row items-center gap-2">
          <BarChart3 className="h-4 w-4 text-gold" />
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
                      <stop offset="5%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 18%)" />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(0, 0%, 45%)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="hsl(0, 0%, 45%)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 10%)",
                      border: "1px solid hsl(0, 0%, 18%)",
                      borderRadius: "0.75rem",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    }}
                    labelStyle={{ color: "hsl(40, 20%, 95%)", fontWeight: 500, fontSize: 12 }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    cursor={{ stroke: "hsl(40, 45%, 55%)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(40, 45%, 55%)"
                    strokeWidth={2}
                    fill="url(#goldGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "hsl(40, 45%, 55%)",
                      stroke: "hsl(0, 0%, 12%)",
                      strokeWidth: 2,
                    }}
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
        <Card
          className="bg-card border-border animate-fade-in"
          style={{ animationDelay: "520ms" }}
        >
          <CardHeader className="flex flex-row items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-gold" />
            <CardTitle className="text-foreground text-sm font-semibold">Últimas Vendas</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {salesLoading ? (
              <TableSkeleton />
            ) : recentSales.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Nenhuma venda registrada"
                description="As vendas realizadas aparecerão aqui automaticamente."
              />
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                {recentSales.map((sale, i) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-secondary/60 transition-all duration-200 group/row animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover/row:bg-[hsl(var(--gold)/0.1)] transition-colors">
                        <DollarSign className="h-3.5 w-3.5 text-muted-foreground group-hover/row:text-gold transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {sale.customer_name || "Cliente não informado"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(new Date(sale.created_at!), "dd/MM/yy · HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-gold tabular-nums">
                        {formatCurrency(sale.total)}
                      </p>
                      <Badge
                        variant={statusLabels[sale.status]?.variant ?? "outline"}
                        className="text-[10px] px-1.5 h-4"
                      >
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
        <Card
          className="bg-card border-border animate-fade-in"
          style={{ animationDelay: "600ms" }}
        >
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="h-4 w-4 text-gold" />
            <CardTitle className="text-foreground text-sm font-semibold">Contatos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {contactsLoading ? (
              <TableSkeleton />
            ) : recentContacts.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum contato adicionado"
                description="Adicione contatos no CRM para vê-los aqui."
              />
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                {recentContacts.map((contact, i) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-secondary/60 transition-all duration-200 group/row animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-semibold text-foreground group-hover/row:bg-[hsl(var(--gold)/0.1)] group-hover/row:text-gold transition-colors">
                        {contact.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {contact.phone || contact.email || "Sem contato"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-[11px] text-muted-foreground">
                        {format(new Date(contact.created_at!), "dd/MM/yy")}
                      </p>
                      {contact.source && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-4 mt-0.5">
                          {contact.source}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock */}
        <Card
          className="bg-card border-border animate-fade-in"
          style={{ animationDelay: "680ms" }}
        >
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="h-4 w-4 text-gold" />
            <CardTitle className="text-foreground text-sm font-semibold">Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {stockLoading ? (
              <TableSkeleton />
            ) : lowStockProducts.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title="Estoque em dia"
                description="Todos os produtos estão acima do estoque mínimo."
              />
            ) : (
              <div className="space-y-1 max-h-[340px] overflow-y-auto pr-1">
                {lowStockProducts.map((product, i) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between py-2.5 px-2.5 rounded-xl hover:bg-secondary/60 transition-all duration-200 group/row animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                        <Package className="h-3.5 w-3.5 text-destructive" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        {product.category && (
                          <p className="text-[11px] text-muted-foreground">{product.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-destructive tabular-nums">
                        {product.stock ?? 0}
                        <span className="text-muted-foreground font-normal"> / {product.minimum_stock ?? 0}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(product.price)}</p>
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
