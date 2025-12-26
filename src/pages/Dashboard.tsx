import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, ShoppingCart, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { name: "Jan", value: 4000 },
  { name: "Fev", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Abr", value: 4500 },
  { name: "Mai", value: 6000 },
  { name: "Jun", value: 5500 },
  { name: "Jul", value: 7000 },
];

const salesData = [
  { name: "Seg", vendas: 12 },
  { name: "Ter", vendas: 19 },
  { name: "Qua", vendas: 15 },
  { name: "Qui", vendas: 22 },
  { name: "Sex", vendas: 28 },
  { name: "Sab", vendas: 35 },
  { name: "Dom", vendas: 18 },
];

const stats = [
  {
    title: "Receita Total",
    value: "R$ 45.231",
    change: "+20.1%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Novos Clientes",
    value: "2.350",
    change: "+18.2%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Vendas",
    value: "12.234",
    change: "+12.5%",
    trend: "up",
    icon: ShoppingCart,
  },
  {
    title: "Taxa de Conversão",
    value: "3.2%",
    change: "-4.1%",
    trend: "down",
    icon: TrendingUp,
  },
];

export default function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="bg-card border-border card-hover animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="h-4 w-4 text-gold" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="flex items-center gap-1 mt-1">
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                  <span
                    className={
                      stat.trend === "up" ? "text-emerald-500 text-sm" : "text-red-500 text-sm"
                    }
                  >
                    {stat.change}
                  </span>
                  <span className="text-muted-foreground text-sm">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card className="bg-card border-border card-hover animate-fade-in" style={{ animationDelay: "400ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground">Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(40, 45%, 55%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="name" stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 12%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "0.75rem",
                    }}
                    labelStyle={{ color: "hsl(40, 20%, 95%)" }}
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
          </CardContent>
        </Card>

        {/* Sales Chart */}
        <Card className="bg-card border-border card-hover animate-fade-in" style={{ animationDelay: "500ms" }}>
          <CardHeader>
            <CardTitle className="text-foreground">Vendas Semanais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 20%)" />
                  <XAxis dataKey="name" stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <YAxis stroke="hsl(0, 0%, 60%)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(0, 0%, 12%)",
                      border: "1px solid hsl(0, 0%, 20%)",
                      borderRadius: "0.75rem",
                    }}
                    labelStyle={{ color: "hsl(40, 20%, 95%)" }}
                  />
                  <Bar dataKey="vendas" fill="hsl(40, 45%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
