import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Package, Calendar, AlertTriangle, History, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WarrantyRecord {
  id: string;
  created_at: string;
  request_type: string;
  status: string;
  reason: string | null;
  customer_name: string | null;
  reseller?: { name: string } | null;
}

interface BatchDetail {
  batch_code: string;
  product_name: string;
  product_category: string | null;
  entry_date: string;
  original_quantity: number;
  warranty_count: number;
  total_loss_count: number;
  defect_rate: number;
  status: "normal" | "attention" | "critical";
  warranties: WarrantyRecord[];
}

interface BatchDetailPanelProps {
  batch: BatchDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchDetailPanel({ batch, open, onOpenChange }: BatchDetailPanelProps) {
  if (!batch) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "attention":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Atenção</Badge>;
      default:
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Normal</Badge>;
    }
  };

  const getWarrantyTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      exchange: { label: "Troca", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      herd: { label: "Rebanho", className: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
      repair: { label: "Conserto", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
      total_loss: { label: "Perda Total", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const config = types[type] || { label: type, className: "bg-muted text-muted-foreground" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getWarrantyStatusBadge = (status: string) => {
    const statuses: Record<string, { label: string; className: string }> = {
      analyzing: { label: "Em Análise", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
      approved: { label: "Aprovada", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      completed: { label: "Concluída", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      denied: { label: "Negada", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    };
    const config = statuses[status] || { label: status, className: "bg-muted text-muted-foreground" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Package className="h-5 w-5 text-primary" />
            Detalhes do Lote
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Batch Info */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-primary">{batch.batch_code}</span>
                {getStatusBadge(batch.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Produto</p>
                  <p className="text-sm font-medium text-foreground">{batch.product_name}</p>
                  {batch.product_category && (
                    <p className="text-xs text-muted-foreground">{batch.product_category}</p>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Data de Entrada</p>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(batch.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Qtd. Original</p>
                  <p className="text-lg font-bold text-foreground">{batch.original_quantity}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Em Garantia</p>
                  <p className="text-lg font-bold text-yellow-400">{batch.warranty_count}</p>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Perda Total</p>
                  <p className="text-lg font-bold text-red-400">{batch.total_loss_count}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Taxa de Defeito</span>
                  </div>
                  <span className="text-2xl font-bold text-primary">
                    {batch.defect_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Warranty History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground">
                  Histórico de Garantias ({batch.warranties.length})
                </h3>
              </div>

              {batch.warranties.length === 0 ? (
                <div className="p-6 text-center rounded-lg bg-muted/20 border border-border">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma solicitação de garantia para este lote.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batch.warranties.map((warranty) => (
                    <div
                      key={warranty.id}
                      className="p-3 rounded-lg bg-muted/20 border border-border space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {getWarrantyTypeBadge(warranty.request_type)}
                          {getWarrantyStatusBadge(warranty.status)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {warranty.reseller?.name || warranty.customer_name || "—"}
                        </span>
                      </div>

                      {warranty.reason && (
                        <p className="text-xs text-muted-foreground italic">
                          "{warranty.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
