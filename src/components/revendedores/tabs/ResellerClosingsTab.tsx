import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2, TrendingUp, ShoppingCart, Undo2, Package, Percent } from "lucide-react";
import { useConsignmentClosings } from "@/hooks/useConsignmentClosings";

interface ResellerClosingsTabProps {
  resellerId: string;
}

export function ResellerClosingsTab({ resellerId }: ResellerClosingsTabProps) {
  const { closings, isLoading } = useConsignmentClosings(resellerId);

  // Calculate totals
  const totals = closings.reduce(
    (acc, closing) => ({
      soldItems: acc.soldItems + Number(closing.total_sold),
      returnedItems: acc.returnedItems + Number(closing.total_returned),
      soldValue: acc.soldValue + Number(closing.total_sold_value),
      commission: acc.commission + Number(closing.total_commission),
      netProfit: acc.netProfit + Number(closing.net_profit),
    }),
    { soldItems: 0, returnedItems: 0, soldValue: 0, commission: 0, netProfit: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-foreground">Fechamentos de Consignação</h3>

      {/* Summary Cards */}
      {closings.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Vendido</p>
                  <p className="text-2xl font-bold text-green-400">{totals.soldItems}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                  <ShoppingCart className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Devolvido</p>
                  <p className="text-2xl font-bold text-orange-400">{totals.returnedItems}</p>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400">
                  <Undo2 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Pagas</p>
                  <p className="text-2xl font-bold text-red-400">R$ {totals.commission.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                  <p className="text-2xl font-bold text-primary">R$ {totals.netProfit.toFixed(2)}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Closings Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {closings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum fechamento registrado</p>
            <p className="text-sm">
              Os fechamentos de consignação aparecerão aqui
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Vendidos</TableHead>
                <TableHead className="text-center">Devolvidos</TableHead>
                <TableHead className="text-right">Total Vendas</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead className="text-right">Lucro Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closings.map((closing) => (
                <TableRow key={closing.id} className="border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {format(new Date(closing.closed_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(closing.closed_at), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                      {closing.total_sold}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400">
                      {closing.total_returned}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    R$ {Number(closing.total_sold_value).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-red-400">
                    - R$ {Number(closing.total_commission).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right text-primary font-medium">
                    R$ {Number(closing.net_profit).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
