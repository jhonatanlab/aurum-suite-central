import { useState } from "react";
import { useResellerStatement, StatementEventType } from "@/hooks/useResellerStatement";
import { ResellerExportMenu } from "../ResellerExportMenu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Loader2,
  Filter,
  Package,
  ShoppingBag,
  RotateCcw,
  ClipboardCheck,
  CreditCard,
} from "lucide-react";

interface ResellerStatementTabProps {
  resellerId: string;
  resellerName: string;
}

const eventTypeConfig: Record<
  StatementEventType,
  { label: string; icon: React.ElementType; color: string }
> = {
  consignment: { label: "Consignação", icon: Package, color: "text-blue-400" },
  sale: { label: "Venda", icon: ShoppingBag, color: "text-green-400" },
  return: { label: "Devolução", icon: RotateCcw, color: "text-orange-400" },
  closing: { label: "Fechamento", icon: ClipboardCheck, color: "text-purple-400" },
  payment: { label: "Pagamento", icon: CreditCard, color: "text-primary" },
};

export function ResellerStatementTab({
  resellerId,
  resellerName,
}: ResellerStatementTabProps) {
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [eventType, setEventType] = useState<StatementEventType | "all">("all");

  const { statement, isLoading, totals } = useResellerStatement(resellerId, {
    startDate,
    endDate,
    eventType,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
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
              <Label className="text-xs text-muted-foreground">Data Início</Label>
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
              <Label className="text-xs text-muted-foreground">Tipo de Evento</Label>
              <Select
                value={eventType}
                onValueChange={(v) => setEventType(v as StatementEventType | "all")}
              >
                <SelectTrigger className="w-40 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="consignment">Consignação</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="return">Devolução</SelectItem>
                  <SelectItem value="closing">Fechamento</SelectItem>
                  <SelectItem value="payment">Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="ml-auto">
              <ResellerExportMenu
                type="statement"
                data={statement}
                resellerName={resellerName}
                totals={totals}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Créditos</p>
                <p className="text-2xl font-bold text-green-400">
                  R$ {totals.totalCredits.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Débitos</p>
                <p className="text-2xl font-bold text-red-400">
                  R$ {totals.totalDebits.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p
                  className={`text-2xl font-bold ${
                    totals.currentBalance > 0 ? "text-primary" : "text-green-400"
                  }`}
                >
                  R$ {Math.abs(totals.currentBalance).toFixed(2).replace(".", ",")}
                  {totals.currentBalance > 0 && (
                    <span className="text-xs ml-1 text-muted-foreground">
                      (devedor)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statement Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Extrato Cronológico
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {statement.length} movimento(s) encontrado(s)
          </p>
        </div>

        {statement.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Tipo</TableHead>
                <TableHead className="text-muted-foreground">Referência</TableHead>
                <TableHead className="text-muted-foreground">Descrição</TableHead>
                <TableHead className="text-right text-muted-foreground">
                  Crédito
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  Débito
                </TableHead>
                <TableHead className="text-right text-muted-foreground">
                  Saldo
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statement.map((event) => {
                const config = eventTypeConfig[event.type];
                const Icon = config.icon;

                return (
                  <TableRow key={event.id} className="border-border hover:bg-muted/30">
                    <TableCell className="text-foreground">
                      {format(new Date(event.date), "dd/MM/yyyy", { locale: ptBR })}
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(event.date), "HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <Badge
                          variant="outline"
                          className={`${config.color} border-current`}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.reference}
                    </TableCell>
                    <TableCell className="text-foreground max-w-[250px] truncate">
                      {event.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {event.credit > 0 ? (
                        <span className="text-green-400 font-medium">
                          + R$ {event.credit.toFixed(2).replace(".", ",")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {event.debit > 0 ? (
                        <span className="text-red-400 font-medium">
                          - R$ {event.debit.toFixed(2).replace(".", ",")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          event.balance > 0 ? "text-primary" : "text-green-400"
                        }
                      >
                        R$ {Math.abs(event.balance).toFixed(2).replace(".", ",")}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum movimento encontrado</p>
            <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
          </div>
        )}
      </div>
    </div>
  );
}
