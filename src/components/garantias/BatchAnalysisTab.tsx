import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, AlertTriangle, TrendingUp, Search, Eye, Layers } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BatchDetailPanel } from "./BatchDetailPanel";

interface BatchAnalysis {
  batch_code: string;
  product_id: string;
  product_name: string;
  product_category: string | null;
  entry_date: string;
  original_quantity: number;
  warranty_count: number;
  total_loss_count: number;
  defect_rate: number;
  status: "normal" | "attention" | "critical";
  warranties: WarrantyRecord[];
  supplier_id: string | null;
  supplier_name: string | null;
}

interface SupplierDefectAnalysis {
  supplier_id: string | null;
  supplier_name: string;
  total_batches: number;
  total_quantity: number;
  total_warranties: number;
  defect_rate: number;
}

interface WarrantyRecord {
  id: string;
  created_at: string;
  request_type: string;
  status: string;
  reason: string | null;
  customer_name: string | null;
  reseller?: { name: string } | null;
}

// Thresholds for batch status
const ATTENTION_THRESHOLD = 5; // >= 5% defect rate
const CRITICAL_THRESHOLD = 15; // >= 15% defect rate

export function BatchAnalysisTab() {
  const { company } = useCompany();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBatch, setSelectedBatch] = useState<BatchAnalysis | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch batches with product and supplier info
  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ["product_batches_analysis", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_batches")
        .select(`
          id,
          batch_code,
          product_id,
          quantity,
          created_at,
          status,
          supplier_id,
          products (
            name,
            category
          ),
          suppliers (
            id,
            name
          )
        `)
        .eq("company_id", company!.id)
        .eq("status", "active")
        .eq("batch_type", "replenishment")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch warranty requests with batch info
  const { data: warranties, isLoading: warrantiesLoading } = useQuery({
    queryKey: ["warranty_requests_by_batch", company?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warranty_requests")
        .select(`
          id,
          batch_code,
          product_id,
          request_type,
          status,
          reason,
          customer_name,
          created_at,
          resellers (
            name
          )
        `)
        .eq("company_id", company!.id);

      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Aggregate data by batch
  const batchAnalysis = useMemo(() => {
    if (!batches || !warranties) return [];

    const analysisMap = new Map<string, BatchAnalysis>();

    // Initialize with batch data - key by batch_code + product_id for uniqueness
    batches.forEach((batch) => {
      const product = batch.products as { name: string; category: string | null } | null;
      const key = `${batch.batch_code}__${batch.product_id}`;
      
      analysisMap.set(key, {
        batch_code: batch.batch_code,
        product_id: batch.product_id,
        product_name: product?.name || "Produto não encontrado",
        product_category: product?.category || null,
        entry_date: batch.created_at,
        original_quantity: batch.quantity,
        warranty_count: 0,
        total_loss_count: 0,
        defect_rate: 0,
        status: "normal",
        warranties: [],
      });
    });

    // Add warranty data - match by both batch_code AND product_id
    warranties.forEach((warranty) => {
      if (!warranty.batch_code) return;

      const key = `${warranty.batch_code}__${warranty.product_id}`;
      const batch = analysisMap.get(key);
      if (batch) {
        batch.warranty_count += 1;
        if (warranty.request_type === "total_loss") {
          batch.total_loss_count += 1;
        }
        batch.warranties.push({
          id: warranty.id,
          created_at: warranty.created_at,
          request_type: warranty.request_type,
          status: warranty.status,
          reason: warranty.reason,
          customer_name: warranty.customer_name,
          reseller: warranty.resellers as { name: string } | null,
        });
      }
    });

    // Calculate defect rate and status
    analysisMap.forEach((batch) => {
      if (batch.original_quantity > 0) {
        batch.defect_rate = (batch.warranty_count / batch.original_quantity) * 100;
      }

      if (batch.defect_rate >= CRITICAL_THRESHOLD) {
        batch.status = "critical";
      } else if (batch.defect_rate >= ATTENTION_THRESHOLD) {
        batch.status = "attention";
      } else {
        batch.status = "normal";
      }

      // Sort warranties by date desc
      batch.warranties.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return Array.from(analysisMap.values());
  }, [batches, warranties]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const monitored = batchAnalysis.length;
    const withAlert = batchAnalysis.filter(
      (b) => b.status === "attention" || b.status === "critical"
    ).length;
    const avgDefectRate =
      monitored > 0
        ? batchAnalysis.reduce((sum, b) => sum + b.defect_rate, 0) / monitored
        : 0;

    return { monitored, withAlert, avgDefectRate };
  }, [batchAnalysis]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batchAnalysis.filter((batch) => {
      const matchesSearch =
        !search ||
        batch.batch_code.toLowerCase().includes(search.toLowerCase()) ||
        batch.product_name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batchAnalysis, search, statusFilter]);

  const isLoading = batchesLoading || warrantiesLoading;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "attention":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            Atenção
          </Badge>
        );
      default:
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            Normal
          </Badge>
        );
    }
  };

  const handleViewBatch = (batch: BatchAnalysis) => {
    setSelectedBatch(batch);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Lotes Monitorados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">{metrics.monitored}</p>
                <p className="text-xs text-muted-foreground">lotes ativos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Lotes com Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-yellow-400">{metrics.withAlert}</p>
                <p className="text-xs text-muted-foreground">
                  ≥ {ATTENTION_THRESHOLD}% de defeito
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa Média de Defeito
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">
                  {metrics.avgDefectRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">média geral</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código do lote ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-muted/30 border-border"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="attention">Atenção</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Batch Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Código do Lote</TableHead>
                  <TableHead className="text-muted-foreground">Produto</TableHead>
                  <TableHead className="text-muted-foreground">Data Entrada</TableHead>
                  <TableHead className="text-muted-foreground text-center">Qtd. Original</TableHead>
                  <TableHead className="text-muted-foreground text-center">Em Garantia</TableHead>
                  <TableHead className="text-muted-foreground text-center">Perda Total</TableHead>
                  <TableHead className="text-muted-foreground text-center">% Defeito</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-border">
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredBatches.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={9} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {search || statusFilter !== "all"
                            ? "Nenhum lote encontrado com os filtros aplicados."
                            : "Nenhum lote cadastrado ainda."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow
                      key={batch.batch_code}
                      className="border-border hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleViewBatch(batch)}
                    >
                      <TableCell className="font-medium text-primary">
                        {batch.batch_code}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-foreground">{batch.product_name}</p>
                          {batch.product_category && (
                            <p className="text-xs text-muted-foreground">
                              {batch.product_category}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(batch.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center text-foreground">
                        {batch.original_quantity}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={batch.warranty_count > 0 ? "text-yellow-400 font-medium" : "text-muted-foreground"}>
                          {batch.warranty_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={batch.total_loss_count > 0 ? "text-red-400 font-medium" : "text-muted-foreground"}>
                          {batch.total_loss_count}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={
                            batch.defect_rate >= CRITICAL_THRESHOLD
                              ? "text-red-400 font-bold"
                              : batch.defect_rate >= ATTENTION_THRESHOLD
                              ? "text-yellow-400 font-medium"
                              : "text-foreground"
                          }
                        >
                          {batch.defect_rate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(batch.status)}</TableCell>
                      <TableCell>
                        <Eye className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Batch Detail Panel */}
      <BatchDetailPanel
        batch={selectedBatch}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
