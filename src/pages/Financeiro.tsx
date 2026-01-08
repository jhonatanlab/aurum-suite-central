import { useState, useMemo } from "react";
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
  RefreshCw,
  Search,
  CalendarIcon,
  Eye
} from "lucide-react";
import { ExportMenu } from "@/components/financeiro/ExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionSidePanel } from "@/components/financeiro/TransactionSidePanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

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
  receipt_path: string | null;
  category?: {
    name: string;
  } | null;
}

export default function Financeiro() {
  const { company } = useCompany();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<FinancialTransaction | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [searchText, setSearchText] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (filterType !== "todos" && t.type !== filterType) return false;
      
      // Status filter
      if (filterStatus !== "todos" && t.status !== filterStatus) return false;
      
      // Text search
      if (searchText && !t.description.toLowerCase().includes(searchText.toLowerCase())) return false;
      
      // Date range filter
      if (dateRange?.from || dateRange?.to) {
        const transactionDate = new Date(t.date + "T00:00:00");
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(transactionDate, { start: dateRange.from, end: dateRange.to })) return false;
        } else if (dateRange.from) {
          if (transactionDate < dateRange.from) return false;
        } else if (dateRange.to) {
          if (transactionDate > dateRange.to) return false;
        }
      }
      
      return true;
    });
  }, [transactions, filterType, filterStatus, searchText, dateRange]);

  // Calculate summary values
  const summaryValues = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    let totalEntradas = 0;
    let totalSaidas = 0;
    let contasAtrasadas = 0;

    transactions.forEach((t) => {
      const transactionDate = new Date(t.date + "T00:00:00");
      const isCurrentMonth = isWithinInterval(transactionDate, { start: monthStart, end: monthEnd });

      if (t.type === "entrada" && t.status === "pago") {
        if (isCurrentMonth) totalEntradas += t.value;
      } else if (t.type === "saida" && t.status === "pago") {
        if (isCurrentMonth) totalSaidas += t.value;
      }

      if (t.status === "atrasado") {
        contasAtrasadas += t.value;
      }
    });

    const saldoAtual = totalEntradas - totalSaidas;

    return {
      saldoAtual,
      entradasMes: totalEntradas,
      saidasMes: totalSaidas,
      contasAtrasadas,
    };
  }, [transactions]);

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

  const handleEdit = (transaction: FinancialTransaction) => {
    setEditingTransaction(transaction);
    setSidePanelOpen(true);
  };

  const handleDeleteClick = (transaction: FinancialTransaction) => {
    setDeletingTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTransaction) return;

    try {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", deletingTransaction.id);

      if (error) throw error;

      toast.success("Movimentação excluída com sucesso");
      refetch();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir movimentação");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingTransaction(null);
    }
  };

  const handleViewReceipt = async (receiptPath: string) => {
    const { data, error } = await supabase.storage
      .from('financial-receipts')
      .createSignedUrl(receiptPath, 60);
    
    if (error || !data?.signedUrl) {
      toast.error("Erro ao acessar comprovante");
      return;
    }
    
    window.open(data.signedUrl, '_blank');
  };

  const handlePanelClose = (open: boolean) => {
    setSidePanelOpen(open);
    if (!open) {
      setEditingTransaction(null);
    }
  };

  const clearFilters = () => {
    setFilterType("todos");
    setFilterStatus("todos");
    setSearchText("");
    setDateRange(undefined);
  };

  const summaryCards = [
    {
      title: "Saldo Atual",
      value: formatCurrency(summaryValues.saldoAtual),
      icon: Wallet,
      color: summaryValues.saldoAtual >= 0 ? "text-primary" : "text-red-500",
      bgColor: summaryValues.saldoAtual >= 0 ? "bg-primary/10" : "bg-red-500/10",
    },
    {
      title: "Entradas do Mês",
      value: formatCurrency(summaryValues.entradasMes),
      icon: TrendingUp,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Saídas do Mês",
      value: formatCurrency(summaryValues.saidasMes),
      icon: TrendingDown,
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
    {
      title: "Contas Atrasadas",
      value: formatCurrency(summaryValues.contasAtrasadas),
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
            <ExportMenu 
              transactions={filteredTransactions} 
              companyName={company?.name} 
            />
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
              onClick={() => {
                setEditingTransaction(null);
                setSidePanelOpen(true);
              }}
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
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <h2 className="text-lg font-semibold text-foreground">Transações</h2>
                
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar descrição..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-9 w-48 bg-background border-border"
                    />
                  </div>

                  {/* Type filter */}
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status filter */}
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-background border-border">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="atrasado">Atrasado</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Date range */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-auto justify-start text-left font-normal bg-background border-border",
                          !dateRange && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "dd/MM", { locale: ptBR })} -{" "}
                              {format(dateRange.to, "dd/MM", { locale: ptBR })}
                            </>
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                          )
                        ) : (
                          "Período"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        locale={ptBR}
                        numberOfMonths={2}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  {/* Clear filters */}
                  {(filterType !== "todos" || filterStatus !== "todos" || searchText || dateRange) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando transações...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {transactions.length === 0 
                  ? "Nenhuma transação registrada ainda."
                  : "Nenhuma transação encontrada com os filtros aplicados."
                }
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
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="border-border">
                      <TableCell className="text-foreground">
                        {format(new Date(transaction.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
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
                        <div className="flex items-center justify-end gap-1">
                          {transaction.receipt_path && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary/80"
                              onClick={() => handleViewReceipt(transaction.receipt_path!)}
                              title="Ver comprovante"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(transaction)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteClick(transaction)}
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
        onOpenChange={handlePanelClose}
        onSuccess={() => refetch()}
        editingTransaction={editingTransaction}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza que deseja excluir a movimentação "{deletingTransaction?.description}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
