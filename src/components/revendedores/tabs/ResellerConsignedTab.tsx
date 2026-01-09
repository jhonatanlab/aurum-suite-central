import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Boxes, ShoppingCart, TrendingUp } from "lucide-react";

interface ResellerConsignedTabProps {
  resellerId: string;
}

// Placeholder data - will be replaced with real data when consignment module is integrated
const mockMetrics = {
  totalPieces: 0,
  withReseller: 0,
  totalSold: 0,
  profitGenerated: 0,
};

const mockInventory: Array<{
  id: string;
  internalCode: string;
  product: string;
  value: number;
  status: "with_reseller" | "sold";
  sentDate: string;
}> = [];

export function ResellerConsignedTab({ resellerId }: ResellerConsignedTabProps) {
  const metrics = [
    {
      label: "Total de Peças",
      value: mockMetrics.totalPieces,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "Em Posse",
      value: mockMetrics.withReseller,
      icon: Boxes,
      color: "text-blue-400",
    },
    {
      label: "Total Vendido",
      value: mockMetrics.totalSold,
      icon: ShoppingCart,
      color: "text-green-400",
    },
    {
      label: "Lucro Gerado",
      value: `R$ ${mockMetrics.profitGenerated.toFixed(2)}`,
      icon: TrendingUp,
      color: "text-primary",
      isMonetary: true,
    },
  ];

  const formatStatus = (status: "with_reseller" | "sold") => {
    const statusMap = {
      with_reseller: { label: "Com revendedor", class: "bg-blue-500/20 text-blue-400" },
      sold: { label: "Vendido", class: "bg-green-500/20 text-green-400" },
    };
    return statusMap[status];
  };

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
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
        {mockInventory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma peça consignada</p>
            <p className="text-sm">
              As peças consignadas aparecerão aqui quando disponíveis
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Código Interno</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInventory.map((item) => {
                const statusInfo = formatStatus(item.status);
                return (
                  <TableRow key={item.id} className="border-border">
                    <TableCell className="font-mono text-sm">
                      {item.internalCode}
                    </TableCell>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell className="text-primary">
                      R$ {item.value.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusInfo.class}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(item.sentDate).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
