import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useCompany } from "@/hooks/useCompany";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus,
  Pencil,
  Pause,
  Play,
  XCircle,
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
import { toast } from "sonner";
import { RecurringSidePanel } from "@/components/financeiro/RecurringSidePanel";

interface RecurringTransaction {
  id: string;
  name: string;
  value: number;
  type: string;
  category_id: string | null;
  payment_method_default: string | null;
  recurrence_type: string;
  custom_interval_days: number | null;
  start_date: string;
  is_limited: boolean;
  installments_total: number | null;
  installments_remaining: number | null;
  status: string;
  next_execution: string;
  category?: { name: string } | null;
}

export default function Recorrencias() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);

  const { data: recurrences = [], isLoading } = useQuery({
    queryKey: ["recurring_transactions", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from("recurring_transactions")
        .select(`
          *,
          category:financial_categories(name)
        `)
        .eq("company_id", company.id)
        .order("next_execution", { ascending: true });

      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!company?.id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      toast.success("Status atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const generateNowMutation = useMutation({
    mutationFn: async (recurrence: RecurringTransaction) => {
      if (!company?.id) throw new Error("Empresa não encontrada");

      // Insert into financial_transactions
      const { error: insertError } = await supabase
        .from("financial_transactions")
        .insert({
          company_id: company.id,
          description: recurrence.name,
          value: recurrence.value,
          type: recurrence.type,
          category_id: recurrence.category_id,
          method: recurrence.payment_method_default,
          date: new Date().toISOString().split("T")[0],
          status: "pendente",
          origin: "recorrente",
        });

      if (insertError) throw insertError;

      // Calculate next execution date
      const nextDate = calculateNextExecution(
        new Date(),
        recurrence.recurrence_type,
        recurrence.custom_interval_days
      );

      // Update recurrence
      const updates: Record<string, unknown> = {
        next_execution: nextDate.toISOString().split("T")[0],
      };

      if (recurrence.is_limited && recurrence.installments_remaining !== null) {
        const newRemaining = recurrence.installments_remaining - 1;
        updates.installments_remaining = newRemaining;
        if (newRemaining <= 0) {
          updates.status = "cancelled";
        }
      }

      const { error: updateError } = await supabase
        .from("recurring_transactions")
        .update(updates)
        .eq("id", recurrence.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Lançamento gerado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao gerar lançamento");
    },
  });

  const calculateNextExecution = (
    currentDate: Date,
    recurrenceType: string,
    customDays: number | null
  ): Date => {
    const next = new Date(currentDate);
    switch (recurrenceType) {
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
      case "custom":
        next.setDate(next.getDate() + (customDays || 30));
        break;
    }
    return next;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getRecurrenceLabel = (type: string, customDays: number | null) => {
    const labels: Record<string, string> = {
      weekly: "Semanal",
      monthly: "Mensal",
      yearly: "Anual",
      custom: customDays ? `A cada ${customDays} dias` : "Personalizado",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      active: { variant: "default", label: "Ativo" },
      paused: { variant: "secondary", label: "Pausado" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const c = config[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    if (type === "entrada") {
      return <span className="text-emerald-500 font-semibold">Entrada</span>;
    }
    return <span className="text-red-500 font-semibold">Saída</span>;
  };

  const handleEdit = (item: RecurringTransaction) => {
    setEditingItem(item);
    setSidePanelOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setSidePanelOpen(true);
  };

  const handlePanelClose = (open: boolean) => {
    setSidePanelOpen(open);
    if (!open) setEditingItem(null);
  };

  return (
    <AppLayout title="Recorrências">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lançamentos Recorrentes</h1>
            <p className="text-muted-foreground mt-1">
              Automatize despesas e receitas repetitivas
            </p>
          </div>
          <Button 
            onClick={handleNew}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Recorrência
          </Button>
        </div>

        {/* Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Carregando recorrências...
              </div>
            ) : recurrences.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma recorrência cadastrada ainda.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="text-muted-foreground">Tipo</TableHead>
                    <TableHead className="text-muted-foreground">Valor</TableHead>
                    <TableHead className="text-muted-foreground">Periodicidade</TableHead>
                    <TableHead className="text-muted-foreground">Próxima Execução</TableHead>
                    <TableHead className="text-muted-foreground">Parcelas</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurrences.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="text-foreground font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(item.type)}
                      </TableCell>
                      <TableCell className={`font-semibold ${
                        item.type === "entrada" ? "text-emerald-500" : "text-red-500"
                      }`}>
                        {formatCurrency(item.value)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {getRecurrenceLabel(item.recurrence_type, item.custom_interval_days)}
                      </TableCell>
                      <TableCell className="text-foreground">
                        {format(new Date(item.next_execution), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.is_limited
                          ? `${item.installments_remaining}/${item.installments_total}`
                          : "∞"}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEdit(item)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {item.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "paused" })}
                              title="Pausar"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          ) : item.status === "paused" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-emerald-500"
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "active" })}
                              title="Reativar"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {item.status !== "cancelled" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => updateStatusMutation.mutate({ id: item.id, status: "cancelled" })}
                              title="Cancelar"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {item.status === "active" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                              onClick={() => generateNowMutation.mutate(item)}
                              title="Gerar agora"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
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

      <RecurringSidePanel
        open={sidePanelOpen}
        onOpenChange={handlePanelClose}
        editingItem={editingItem}
      />
    </AppLayout>
  );
}
