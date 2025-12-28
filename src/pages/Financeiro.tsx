import { useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Pencil,
  Trash2,
  Plus,
  RefreshCw
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionSidePanel } from "@/components/financeiro/TransactionSidePanel";

interface FinancialTransaction {
  id: string;
  date: string;
  description: string;
  category_id: string | null;
  type: string;
  value: number;
  method: string | null;
  status: string;
  created_at: string;
  category?: {
    name: string;
  } | null;
}

export default function Financeiro() {
  const { company } = useCompany();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["financial_transactions", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          *,
          category:financial_categories(name)
        `)
        .eq("company_id", company.id)
        .order("date", { ascending: false });

      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!company?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pago: { variant: "default", label: "Pago" },
      pendente: { variant: "secondary", label: "Pendente" },
      atrasado: { variant: "destructive", label: "Atrasado" },
    };
    const config = statusConfig[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === "entrada") {
      return <span className="text-emerald-500 font-semibold">+ Entrada</span>;
    }
    return <span className="text-red-500 font-semibold">- Saída</span>;
  };

  const summaryCards = [
    {
      title: "Saldo Atual",
      value: "R$ 0,00",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Entradas do Mês",
      value: "R$ 0,00",
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Saídas do Mês",
      value: "R$ 0,00",
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Contas Atrasadas",
      value: "R$ 0,00",
      icon: AlertTriangle,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestão Financeira</h1>
            <p className="text-muted-foreground mt-1">
              Controle de entradas, saídas e fluxo de caixa
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              asChild
            >
              <Link to="/financeiro/recorrencias">
                <RefreshCw className="h-4 w-4 mr-2" />
                Recorrências
              </Link>
            </Button>
            <Button 
              onClick={() => setSidePanelOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => (
            <Card key={card.title} className="bg-card border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {card.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transactions Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Transações</h2>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando transações...
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma transação registrada ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Data</TableHead>
                    <TableHead className="text-muted-foreground">Descrição</TableHead>
                    <TableHead className="text-muted-foreground">Categoria</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Valor</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Método</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-border">
                      <TableCell className="text-foreground">
                        {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.category?.name || "—"}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(transaction.type)}
                      </TableCell>
                      <TableCell className={`font-semibold ${
                        transaction.type === "entrada" ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {formatCurrency(transaction.value)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {transaction.method || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionSidePanel
        open={sidePanelOpen}
        onOpenChange={setSidePanelOpen}
        onSuccess={() => refetch()}
      />
    </AppLayout>
  );
}
