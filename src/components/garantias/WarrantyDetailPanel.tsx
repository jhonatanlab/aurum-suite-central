import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Package, User, Calendar, FileText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { WarrantyRequest } from "@/hooks/useWarranties";
import { TYPE_LABELS, STATUS_CONFIG } from "./WarrantyRequestsTable";

interface WarrantyDetailPanelProps {
  warranty: WarrantyRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: { id: string; status?: string; resolution?: string; observation?: string }) => void;
  isUpdating: boolean;
}

export function WarrantyDetailPanel({
  warranty,
  open,
  onOpenChange,
  onUpdate,
  isUpdating,
}: WarrantyDetailPanelProps) {
  const [status, setStatus] = useState(warranty?.status || "analyzing");
  const [resolution, setResolution] = useState(warranty?.resolution || "");

  useEffect(() => {
    if (warranty) {
      setStatus(warranty.status);
      setResolution(warranty.resolution || "");
    }
  }, [warranty]);

  if (!warranty) return null;

  const statusConfig = STATUS_CONFIG[warranty.status] || STATUS_CONFIG.analyzing;

  const handleSave = () => {
    onUpdate({
      id: warranty.id,
      status,
      resolution: resolution || undefined,
    });
  };

  const hasChanges = status !== warranty.status || resolution !== (warranty.resolution || "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            Detalhes da Garantia
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Product Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">Produto</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="font-medium text-foreground">{warranty.product?.name}</p>
              {warranty.product?.category && (
                <p className="text-sm text-muted-foreground">{warranty.product.category}</p>
              )}
            </div>
          </div>

          {/* Client Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Cliente</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="font-medium text-foreground">
                {warranty.reseller?.name || warranty.customer_name || "Não informado"}
              </p>
              {warranty.reseller && (
                <p className="text-sm text-muted-foreground">Revendedor</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tipo</p>
              <p className="text-sm font-medium text-foreground">
                {TYPE_LABELS[warranty.request_type] || warranty.request_type}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Data Solicitação</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(warranty.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lote</p>
              <p className="text-sm font-medium text-foreground">
                {warranty.batch_code ||
                  (warranty.batch_date
                    ? format(new Date(warranty.batch_date), "dd/MM/yyyy", { locale: ptBR })
                    : "—")}
              </p>
            </div>
            {warranty.resolution_date && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data Resolução</p>
                <p className="text-sm font-medium text-foreground">
                  {format(new Date(warranty.resolution_date), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Reason */}
          {warranty.reason && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">Motivo / Defeito</span>
              </div>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                {warranty.reason}
              </p>
            </div>
          )}

          {/* Observation */}
          {warranty.observation && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Observações</p>
              <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">
                {warranty.observation}
              </p>
            </div>
          )}

          <Separator />

          {/* Status Update */}
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Atualizar Status</h4>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Aprovada</SelectItem>
                  <SelectItem value="denied">Negada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resolução / Parecer</Label>
              <Textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Descreva a resolução ou parecer..."
                className="bg-card resize-none"
                rows={3}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || isUpdating}
              className="w-full"
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
