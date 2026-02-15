import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Package, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  totalCompanies: number;
  totalUsers: number;
  totalProducts: number;
  totalSales: number;
  totalSalesValue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.functions.invoke("admin-stats");
        if (error) throw error;
        setStats(data);
      } catch (err) {
        console.error("Erro ao buscar estatísticas admin:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const cards = [
    {
      title: "Total de Empresas",
      value: stats?.totalCompanies ?? 0,
      icon: Building2,
      format: (v: number) => v.toString(),
    },
    {
      title: "Usuários Cadastrados",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      format: (v: number) => v.toString(),
    },
    {
      title: "Produtos Cadastrados",
      value: stats?.totalProducts ?? 0,
      icon: Package,
      format: (v: number) => v.toString(),
    },
    {
      title: "Vendas Realizadas",
      value: stats?.totalSales ?? 0,
      icon: ShoppingCart,
      format: (v: number) => v.toString(),
    },
    {
      title: "Valor em Vendas",
      value: stats?.totalSalesValue ?? 0,
      icon: DollarSign,
      format: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <AdminLayout title="Dashboard Admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Painel Administrativo</h2>
          <p className="text-muted-foreground">
            Visão geral de todas as empresas do sistema.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((card) => (
            <Card key={card.title} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-5 w-5 text-gold" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                ) : (
                  <div className="text-3xl font-bold text-foreground">
                    {card.format(card.value)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
