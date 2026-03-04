import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, List, BarChart3 } from "lucide-react";
import { useWarranties, WarrantyRequest } from "@/hooks/useWarranties";
import { WarrantyStatsCards } from "@/components/garantias/WarrantyStatsCards";
import { WarrantyFilters } from "@/components/garantias/WarrantyFilters";
import { WarrantyRequestsTable } from "@/components/garantias/WarrantyRequestsTable";
import { NewWarrantyModal } from "@/components/garantias/NewWarrantyModal";
import { WarrantyDetailPanel } from "@/components/garantias/WarrantyDetailPanel";
import { BatchAnalysisTab } from "@/components/garantias/BatchAnalysisTab";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Garantias() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRequest | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  const { warranties, stats, isLoading, createWarranty, updateWarranty } = useWarranties({
    search,
    status,
    type,
    dateFrom,
    dateTo,
  });

  const handleClearFilters = () => {
    setSearch("");
    setStatus("all");
    setType("all");
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const handleExportCSV = () => {
    if (warranties.length === 0) return;

    const headers = [
      "Data Solicitação",
      "Cliente",
      "Produto",
      "Categoria",
      "Tipo",
      "Lote",
      "Status",
      "Motivo",
      "Resolução",
    ];

    const typeLabels: Record<string, string> = {
      exchange: "Troca Simples",
      herd: "Rebanho",
      repair: "Conserto",
      total_loss: "Perda Total",
    };

    const statusLabels: Record<string, string> = {
      analyzing: "Em Análise",
      approved: "Aprovada",
      completed: "Concluída",
      denied: "Negada",
    };

    const rows = warranties.map((w) => [
      format(new Date(w.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      w.reseller?.name || w.customer_name || "",
      w.product?.name || "",
      w.product?.category || "",
      typeLabels[w.request_type] || w.request_type,
      w.batch_code || (w.batch_date ? format(new Date(w.batch_date), "dd/MM/yyyy") : ""),
      statusLabels[w.status] || w.status,
      w.reason || "",
      w.resolution || "",
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `garantias_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = (warranty: WarrantyRequest) => {
    setSelectedWarranty(warranty);
    setDetailPanelOpen(true);
  };

  return (
    <AppLayout title="Garantias & Retornos">
      <div className="space-y-6">
        {/* Stats Cards */}
        <WarrantyStatsCards stats={stats} isLoading={isLoading} />

        {/* Tabs */}
        <Tabs defaultValue="requests" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <TabsList className="bg-muted/30">
              <TabsTrigger value="requests" className="gap-2">
                <List className="h-4 w-4" />
                Lista de Solicitações
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Análise de Lotes
              </TabsTrigger>
            </TabsList>

            <Button onClick={() => setNewModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Garantia
            </Button>
          </div>

          <TabsContent value="requests" className="space-y-4 mt-0">
            <WarrantyFilters
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              type={type}
              onTypeChange={setType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              onExportCSV={handleExportCSV}
              onClearFilters={handleClearFilters}
            />

            <WarrantyRequestsTable
              warranties={warranties}
              isLoading={isLoading}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>

          <TabsContent value="analysis" className="mt-0">
            <BatchAnalysisTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* New Warranty Modal */}
      <NewWarrantyModal
        open={newModalOpen}
        onOpenChange={setNewModalOpen}
        onSubmit={(data) => createWarranty.mutate(data as any)}
        isLoading={createWarranty.isPending}
      />

      {/* Detail Panel */}
      <WarrantyDetailPanel
        warranty={selectedWarranty}
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        onUpdate={(data) => updateWarranty.mutate(data)}
        isUpdating={updateWarranty.isPending}
      />
    </AppLayout>
  );
}
