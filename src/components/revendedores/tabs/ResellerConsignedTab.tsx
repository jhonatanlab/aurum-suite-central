import { useState, useMemo } from "react";
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

interface GroupedProduct {
  product_id: string;
  product_name: string;
  consignment_value: number;
  quantity: number;
  sent_at: string;
  observation: string | null;
}

export function ResellerConsignedTab({ resellerId }: ResellerConsignedTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { items, isLoading, metrics } = useConsignment(resellerId);

  // Group items by product_id (only items with_reseller status)
  const groupedProducts = useMemo(() => {
    const grouped = new Map<string, GroupedProduct>();

    items
      .filter((item) => item.status === "with_reseller")
      .forEach((item) => {
        const key = item.product_id;
        const existing = grouped.get(key);

        if (existing) {
          existing.quantity += 1;
        } else {
          grouped.set(key, {
            product_id: item.product_id,
            product_name: item.product?.name || "Produto não encontrado",
            consignment_value: Number(item.consignment_value),
            quantity: 1,
            sent_at: item.sent_at,
            observation: item.observation,
          });
        }
      });

    return Array.from(grouped.values());
  }, [items]);

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

      {/* Inventory Table - Grouped by Product */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : groupedProducts.length === 0 ? (
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
                <TableHead className="text-center">Quantidade</TableHead>
                <TableHead className="text-right">Valor Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProducts.map((product) => (
                <TableRow key={product.product_id} className="border-border">
                  <TableCell className="font-medium">
                    {product.product_name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                      {product.quantity} un.
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    R$ {product.consignment_value.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    R$ {(product.consignment_value * product.quantity).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
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
