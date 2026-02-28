import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Input } from "@/components/ui/input";
import { Search, Package, RefreshCw, Wrench } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BatchRecord {
  id: string;
  batch_code: string;
  quantity: number;
  created_at: string;
  created_by: string;
  status: string;
  observation: string | null;
  product_id: string;
  product_name: string;
  is_first_batch: boolean;
  batch_type: string;
  adjustment_reason: string | null;
}

export function BatchHistoryTab() {
  const { company } = useCompany();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all batches with product info
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ["product_batches_history", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];

      const { data, error } = await supabase.
      from("product_batches").
      select(`
          id,
          batch_code,
          quantity,
          created_at,
          created_by,
          status,
          observation,
          product_id,
          batch_type,
          adjustment_reason,
          products!inner(name, created_at)
        `).
      eq("company_id", company.id).
      order("created_at", { ascending: false });

      if (error) throw error;

      // Process batches to determine if it's the first batch (new product) or replenishment
      const productFirstBatch: Record<string, string> = {};

      // First pass: find the earliest batch for each product
      const sortedByOldest = [...(data || [])].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      sortedByOldest.forEach((batch) => {
        if (!productFirstBatch[batch.product_id]) {
          productFirstBatch[batch.product_id] = batch.id;
        }
      });

      return (data || []).map((batch) => ({
        id: batch.id,
        batch_code: batch.batch_code,
        quantity: batch.quantity,
        created_at: batch.created_at,
        created_by: batch.created_by,
        status: batch.status,
        observation: batch.observation,
        product_id: batch.product_id,
        product_name: (batch.products as {name: string;})?.name || "Produto desconhecido",
        is_first_batch: productFirstBatch[batch.product_id] === batch.id,
        batch_type: (batch as any).batch_type || "replenishment",
        adjustment_reason: (batch as any).adjustment_reason || null
      })) as BatchRecord[];
    },
    enabled: !!company?.id
  });

  // Filter batches by search query (batch code or product name)
  const filteredBatches = useMemo(() => {
    if (!searchQuery.trim()) return batches;

    const query = searchQuery.toLowerCase();
    return batches.filter(
      (batch) =>
      batch.batch_code.toLowerCase().includes(query) ||
      batch.product_name.toLowerCase().includes(query)
    );
  }, [batches, searchQuery]);

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getTypeBadge = (batch: BatchRecord) => {
    if (batch.batch_type === "sale") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
          <Package className="w-3 h-3" />
          Venda
        </span>);

    }
    if (batch.batch_type === "adjustment") {
      const reasonLabels: Record<string, string> = {
        loss: "Perda",
        breakage: "Quebra",
        inventory: "Inventário",
        correction: "Correção",
        venda: "Venda"
      };
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500 text-secondary">
          <Wrench className="w-3 h-3" />
          {reasonLabels[batch.adjustment_reason || ""] || "Ajuste"}
        </span>);

    }
    if (batch.is_first_batch) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
          <Package className="w-3 h-3" />
          Novo Produto
        </span>);

    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
        <RefreshCw className="w-3 h-3" />
        Reposição
      </span>);

  };

  const getStatusBadge = (status: string) => {
    const isActive = status === "active";
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive ?
        "bg-green-500/20 text-green-400" :
        "bg-red-500/20 text-red-400"}`
        }>

        {isActive ? "Ativo" : "Inativo"}
      </span>);

  };

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código do lote ou produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20" />

        </div>
        <p className="text-sm text-muted-foreground">
          {filteredBatches.length} {filteredBatches.length === 1 ? "registro" : "registros"}
        </p>
      </div>

      {/* Table with ScrollArea */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ?
        <div className="p-8 text-center text-muted-foreground">
            Carregando histórico de lotes...
          </div> :
        batches.length === 0 ?
        <div className="p-8 text-center text-muted-foreground">
            Nenhum lote registrado ainda.
          </div> :
        filteredBatches.length === 0 ?
        <div className="p-8 text-center text-muted-foreground">
            Nenhum lote encontrado com o filtro aplicado.
          </div> :

        <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Código do Lote</TableHead>
                  <TableHead className="text-muted-foreground">Produto</TableHead>
                  <TableHead className="text-muted-foreground">Tipo</TableHead>
                  <TableHead className="text-muted-foreground text-right">Quantidade</TableHead>
                  <TableHead className="text-muted-foreground">Data/Hora</TableHead>
                  <TableHead className="text-muted-foreground">Usuário</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) =>
              <TableRow
                key={batch.id}
                className="border-border hover:bg-muted/30 transition-colors">

                    <TableCell className="font-mono font-medium text-foreground">
                      {batch.batch_code}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {batch.product_name}
                    </TableCell>
                    <TableCell>{getTypeBadge(batch)}</TableCell>
                    <TableCell className={`text-right font-semibold ${batch.quantity < 0 ? 'text-red-400' : 'text-primary'}`}>
                      {batch.quantity > 0 ? '+' : ''}{batch.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(batch.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {batch.created_by}
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.status)}</TableCell>
                  </TableRow>
              )}
              </TableBody>
            </Table>
          </ScrollArea>
        }
      </div>
    </div>);

}