import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, Package, ShoppingCart, Undo2, TrendingUp, Percent, Loader2 } from "lucide-react";
import { ConsignmentItem } from "@/hooks/useConsignment";

interface ClosingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ConsignmentItem[];
  commissionType: string;
  commissionValue: number;
  resellerName: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ClosingModal({
  open,
  onOpenChange,
  items,
  commissionType,
  commissionValue,
  resellerName,
  onConfirm,
  isLoading = false,
}: ClosingModalProps) {
  // Calculate summary metrics
  const summary = useMemo(() => {
    const soldItems = items.filter((i) => i.status === "sold");
    const returnedItems = items.filter((i) => i.status === "returned");
    const pendingItems = items.filter((i) => i.status === "with_reseller");

    const totalSoldValue = soldItems.reduce(
      (acc, item) => acc + Number(item.sale_value || item.consignment_value),
      0
    );

    const totalCommission = soldItems.reduce(
      (acc, item) => acc + Number(item.commission_amount || 0),
      0
    );

    return {
      soldCount: soldItems.length,
      returnedCount: returnedItems.length,
      pendingCount: pendingItems.length,
      totalSoldValue,
      totalCommission,
      netProfit: totalSoldValue - totalCommission,
    };
  }, [items]);

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  const hasActivity = summary.soldCount > 0 || summary.returnedCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Fechamento de Consignação
          </DialogTitle>
          <DialogDescription>
            Gerar fechamento para <strong>{resellerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-3 text-center">
                <Package className="h-5 w-5 mx-auto text-blue-400 mb-1" />
                <p className="text-2xl font-bold text-blue-400">{summary.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Em Posse</p>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/20">
              <CardContent className="p-3 text-center">
                <ShoppingCart className="h-5 w-5 mx-auto text-green-400 mb-1" />
                <p className="text-2xl font-bold text-green-400">{summary.soldCount}</p>
                <p className="text-xs text-muted-foreground">Vendidos</p>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/10 border-orange-500/20">
              <CardContent className="p-3 text-center">
                <Undo2 className="h-5 w-5 mx-auto text-orange-400 mb-1" />
                <p className="text-2xl font-bold text-orange-400">{summary.returnedCount}</p>
                <p className="text-xs text-muted-foreground">Devolvidos</p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Resumo Financeiro
            </h4>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Vendido</span>
                <span className="font-medium text-foreground">
                  R$ {summary.totalSoldValue.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Comissão ({commissionType === "percent" ? `${commissionValue}%` : `R$ ${commissionValue}/un.`})
                </span>
                <span className="font-medium text-red-400">
                  - R$ {summary.totalCommission.toFixed(2)}
                </span>
              </div>

              <div className="border-t border-border pt-2 flex justify-between items-center">
                <span className="font-medium text-foreground">Lucro Líquido</span>
                <span className="text-lg font-bold text-primary">
                  R$ {summary.netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Warning */}
          {!hasActivity && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Nenhuma venda ou devolução registrada para gerar fechamento.
              </p>
            </div>
          )}

          {hasActivity && (
            <div className="text-center p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-400">
                ⚠️ O fechamento é imutável e não poderá ser alterado após criado.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!hasActivity || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileCheck className="h-4 w-4 mr-2" />
                Gerar Fechamento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
