import { useState } from "react";
import { useResellerPayments, ClosingWithBalance } from "@/hooks/useResellerPayments";
import { PaymentModal } from "../PaymentModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Wallet, Clock, CheckCircle2, Loader2, CreditCard, AlertCircle } from "lucide-react";

interface ResellerPaymentsTabProps {
  resellerId: string;
}

export function ResellerPaymentsTab({ resellerId }: ResellerPaymentsTabProps) {
  const {
    payments,
    isLoadingPayments,
    closingsWithBalance,
    isLoadingClosings,
    totalPaid,
    totalPending,
    pendingClosings,
    createPayment,
  } = useResellerPayments(resellerId);

  const [selectedClosing, setSelectedClosing] = useState<ClosingWithBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePayClosing = (closing: ClosingWithBalance) => {
    setSelectedClosing(closing);
    setIsModalOpen(true);
  };

  const handleConfirmPayment = async (data: {
    closing_id: string;
    amount: number;
    payment_method: string;
    observation?: string;
  }) => {
    await createPayment.mutateAsync(data);
  };

  const isLoading = isLoadingPayments || isLoadingClosings;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo em Aberto</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {totalPending.toFixed(2).replace(".", ",")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pago</p>
                <p className="text-2xl font-bold text-green-400">
                  R$ {totalPaid.toFixed(2).replace(".", ",")}
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
                <p className="text-sm text-muted-foreground">Fechamentos Pendentes</p>
                <p className="text-2xl font-bold text-orange-400">
                  {pendingClosings.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Closings */}
      {pendingClosings.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Fechamentos com Saldo Pendente
            </h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Período</TableHead>
                <TableHead className="text-right text-muted-foreground">Valor Vendido</TableHead>
                <TableHead className="text-right text-muted-foreground">Comissão</TableHead>
                <TableHead className="text-right text-muted-foreground">Pago</TableHead>
                <TableHead className="text-right text-muted-foreground">Pendente</TableHead>
                <TableHead className="text-right text-muted-foreground">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingClosings.map((closing) => (
                <TableRow key={closing.id} className="border-border hover:bg-muted/30">
                  <TableCell className="text-foreground">
                    {format(new Date(closing.period_start), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(new Date(closing.period_end), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    R$ {closing.total_sold_value.toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    R$ {closing.total_commission.toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell className="text-right text-green-400">
                    R$ {closing.paid_amount.toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      R$ {closing.pending_amount.toFixed(2).replace(".", ",")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handlePayClosing(closing)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Pagar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Payment History */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Histórico de Pagamentos
          </h3>
        </div>

        {payments && payments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-muted-foreground">Data</TableHead>
                <TableHead className="text-muted-foreground">Método</TableHead>
                <TableHead className="text-right text-muted-foreground">Valor</TableHead>
                <TableHead className="text-muted-foreground">Observação</TableHead>
                <TableHead className="text-muted-foreground">Registrado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id} className="border-border hover:bg-muted/30">
                  <TableCell className="text-foreground">
                    {format(new Date(payment.paid_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {payment.payment_method || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-green-400">
                    R$ {Number(payment.amount).toFixed(2).replace(".", ",")}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {payment.observation || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {payment.created_by || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Wallet className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum pagamento registrado</p>
            <p className="text-sm">Os pagamentos aparecerão aqui após serem registrados</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        closing={selectedClosing}
        onConfirm={handleConfirmPayment}
        isLoading={createPayment.isPending}
      />
    </div>
  );
}
