import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useResellerReports } from "@/hooks/useResellerReports";
import { useResellers } from "@/hooks/useResellers";
import { ResellerExportMenu } from "@/components/revendedores/ResellerExportMenu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users,
  TrendingUp,
  Wallet,
  AlertCircle,
  Package,
  Loader2,
  BarChart3,
  Filter,
} from "lucide-react";

export default function RelatoriosRevendedores() {
  const [startDate, setStartDate] = useState(
    format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [selectedReseller, setSelectedReseller] = useState<string>("all");

  const { resellers } = useResellers();
  const { individual, consolidated, isLoading } = useResellerReports({
    startDate,
    endDate,
    resellerId: selectedReseller === "all" ? undefined : selectedReseller,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <AppLayout title="Relatórios de Revendedores">
      <div className="space-y-6">
        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros:</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Data Início
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 bg-background"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">Data Fim</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40 bg-background"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Revendedor
                </Label>
                <Select
                  value={selectedReseller}
                  onValueChange={setSelectedReseller}
                >
                  <SelectTrigger className="w-48 bg-background">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Revendedores</SelectItem>
                    {resellers?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto">
                <ResellerExportMenu
                  type="report"
                  data={individual}
                  consolidated={consolidated}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Consolidated Summary */}
            {consolidated && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <TrendingUp className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Vendido
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(consolidated.totalSoldValue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/20">
                        <Wallet className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Comissões
                        </p>
                        <p className="text-lg font-bold text-purple-400">
                          {formatCurrency(consolidated.totalCommission)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/20">
                        <Wallet className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Pago
                        </p>
                        <p className="text-lg font-bold text-green-400">
                          {formatCurrency(consolidated.totalPaid)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/20">
                        <AlertCircle className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Saldo Pendente
                        </p>
                        <p className="text-lg font-bold text-orange-400">
                          {formatCurrency(consolidated.totalPending)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/20">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Revendedores
                        </p>
                        <p className="text-lg font-bold text-blue-400">
                          {consolidated.activeResellers}/
                          {consolidated.totalResellers}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-cyan-500/20">
                        <Package className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Peças Consignadas
                        </p>
                        <p className="text-lg font-bold text-cyan-400">
                          {consolidated.totalItemsWithResellers}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Individual Reports Table */}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Desempenho por Revendedor
                </CardTitle>
              </CardHeader>

              {individual.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-border">
                      <TableHead className="text-muted-foreground">
                        Revendedor
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Peças Vendidas
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Valor Vendido
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Comissão
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Total Pago
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Saldo Pendente
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Em Mãos
                      </TableHead>
                      <TableHead className="text-right text-muted-foreground">
                        Devoluções
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {individual.map((row) => (
                      <TableRow
                        key={row.resellerId}
                        className="border-border hover:bg-muted/30"
                      >
                        <TableCell className="font-medium text-foreground">
                          {row.resellerName}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {row.totalSold}
                        </TableCell>
                        <TableCell className="text-right text-primary font-medium">
                          {formatCurrency(row.totalSoldValue)}
                        </TableCell>
                        <TableCell className="text-right text-purple-400">
                          {formatCurrency(row.totalCommission)}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {formatCurrency(row.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pendingBalance > 0 ? (
                            <Badge
                              variant="secondary"
                              className="bg-orange-500/20 text-orange-400"
                            >
                              {formatCurrency(row.pendingBalance)}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-green-500/20 text-green-400"
                            >
                              Quitado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {row.itemsWithReseller}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {row.totalReturned}
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Totals row */}
                    {individual.length > 1 && consolidated && (
                      <TableRow className="border-border bg-muted/50 font-semibold">
                        <TableCell className="text-foreground">TOTAL</TableCell>
                        <TableCell className="text-right text-foreground">
                          {individual.reduce((sum, r) => sum + r.totalSold, 0)}
                        </TableCell>
                        <TableCell className="text-right text-primary">
                          {formatCurrency(consolidated.totalSoldValue)}
                        </TableCell>
                        <TableCell className="text-right text-purple-400">
                          {formatCurrency(consolidated.totalCommission)}
                        </TableCell>
                        <TableCell className="text-right text-green-400">
                          {formatCurrency(consolidated.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right text-orange-400">
                          {formatCurrency(consolidated.totalPending)}
                        </TableCell>
                        <TableCell className="text-right text-foreground">
                          {consolidated.totalItemsWithResellers}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {individual.reduce(
                            (sum, r) => sum + r.totalReturned,
                            0
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    Nenhum dado encontrado
                  </p>
                  <p className="text-sm">
                    Ajuste os filtros para ver resultados
                  </p>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
