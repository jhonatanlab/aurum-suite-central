import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Boxes, ShoppingCart, TrendingUp, Plus, Loader2 } from "lucide-react";
import { useConsignment } from "@/hooks/useConsignment";
import { AddBatchModal } from "@/components/revendedores/AddBatchModal";

interface ResellerConsignedTabProps {
  resellerId: string;
}

export function ResellerConsignedTab({ resellerId }: ResellerConsignedTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { items, isLoading, metrics } = useConsignment(resellerId);

  const metricsData = [
    {
      label: "Total de Peças",
      value: metrics.totalPieces,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "Em Posse",
      value: metrics.withReseller,
      icon: Boxes,
      color: "text-blue-400",
    },
    {
      label: "Total Vendido",
      value: metrics.totalSold,
      icon: ShoppingCart,
      color: "text-green-400",
    },
    {
      label: "Lucro Gerado",
      value: `R$ ${metrics.profitGenerated.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-primary",
      isMonetary: true,
    },
  ];

  const formatStatus = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      with_reseller: { label: "Com revendedor", class: "bg-blue-500/20 text-blue-400" },
      sold: { label: "Vendido", class: "bg-green-500/20 text-green-400" },
    };
    return statusMap[status] || { label: status, class: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      {/* Header with Action */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-foreground">Inventário Consignado</h3>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Lote
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.map((metric) => (
          <Card key={metric.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>
                    {metric.value}
                  </p>
                </div>
                <div className={`p-2 rounded-lg bg-muted/50 ${metric.color}`}>
                  <metric.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Inventory Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma peça consignada</p>
            <p className="text-sm mb-4">
              Clique em "Adicionar Lote" para consignar produtos
            </p>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(true)}
              className="border-primary/50 text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Lote
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Envio</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const statusInfo = formatStatus(item.status);
                return (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-medium">
                      {item.product?.name || "Produto não encontrado"}
                    </TableCell>
                    <TableCell className="text-primary font-medium">
                      R$ {Number(item.consignment_value).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.class}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.sent_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {item.observation || "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add Batch Modal */}
      <AddBatchModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        resellerId={resellerId}
      />
    </div>
  );
}
