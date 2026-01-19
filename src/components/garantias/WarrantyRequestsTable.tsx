import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { WarrantyRequest } from "@/hooks/useWarranties";

interface WarrantyRequestsTableProps {
  warranties: WarrantyRequest[];
  isLoading: boolean;
  onViewDetails: (warranty: WarrantyRequest) => void;
}

const TYPE_LABELS: Record<string, string> = {
  exchange: "Troca Simples",
  herd: "Rebanho",
  repair: "Conserto",
  total_loss: "Perda Total",
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  analyzing: { label: "Em Análise", variant: "secondary" },
  approved: { label: "Aprovada", variant: "default" },
  completed: { label: "Concluída", variant: "outline" },
  denied: { label: "Negada", variant: "destructive" },
};

export function WarrantyRequestsTable({
  warranties,
  isLoading,
  onViewDetails,
}: WarrantyRequestsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-muted/50 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (warranties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted/50 mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
        <p className="text-sm text-muted-foreground">
          Clique em "Nova Garantia" para registrar uma solicitação
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="text-muted-foreground font-medium">Data Solicitação</TableHead>
            <TableHead className="text-muted-foreground font-medium">Cliente</TableHead>
            <TableHead className="text-muted-foreground font-medium">Produto</TableHead>
            <TableHead className="text-muted-foreground font-medium">Tipo</TableHead>
            <TableHead className="text-muted-foreground font-medium">Lote</TableHead>
            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
            <TableHead className="text-muted-foreground font-medium w-[80px]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {warranties.map((warranty) => {
            const statusConfig = STATUS_CONFIG[warranty.status] || STATUS_CONFIG.analyzing;
            
            return (
              <TableRow key={warranty.id} className="hover:bg-muted/20">
                <TableCell className="text-foreground">
                  {format(new Date(warranty.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell className="text-foreground">
                  {warranty.reseller?.name || warranty.customer_name || "—"}
                  {warranty.reseller && (
                    <span className="text-xs text-muted-foreground ml-1">(Revendedor)</span>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-foreground font-medium">
                      {warranty.product?.name || "Produto não encontrado"}
                    </p>
                    {warranty.product?.category && (
                      <p className="text-xs text-muted-foreground">{warranty.product.category}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-foreground">
                  {TYPE_LABELS[warranty.request_type] || warranty.request_type}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {warranty.batch_code ||
                    (warranty.batch_date
                      ? format(new Date(warranty.batch_date), "dd/MM/yy", { locale: ptBR })
                      : "—")}
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewDetails(warranty)}
                    className="hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { TYPE_LABELS, STATUS_CONFIG };
