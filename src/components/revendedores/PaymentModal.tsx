import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClosingWithBalance } from "@/hooks/useResellerPayments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Wallet } from "lucide-react";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closing: ClosingWithBalance | null;
  onConfirm: (data: {
    closing_id: string;
    amount: number;
    payment_method: string;
    observation?: string;
  }) => Promise<void>;
  isLoading: boolean;
}

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "cheque", label: "Cheque" },
];

export function PaymentModal({
  open,
  onOpenChange,
  closing,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [observation, setObservation] = useState("");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && closing) {
      setAmount(closing.pending_amount.toFixed(2));
      setPaymentMethod("");
      setObservation("");
    }
    onOpenChange(isOpen);
  };

  const handleConfirm = async () => {
    if (!closing || !paymentMethod || !amount) return;

    const numericAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numericAmount) || numericAmount <= 0) return;
    if (numericAmount > closing.pending_amount) return;

    await onConfirm({
      closing_id: closing.id,
      amount: numericAmount,
      payment_method: paymentMethod,
      observation: observation || undefined,
    });

    onOpenChange(false);
  };

  const numericAmount = parseFloat((amount || "0").replace(",", "."));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0 && numericAmount <= (closing?.pending_amount || 0);
  const canSubmit = closing && paymentMethod && isValidAmount && !isLoading;

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Wallet className="h-5 w-5 text-primary" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        {closing && (
          <div className="space-y-4 py-4">
            {/* Closing Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <p className="text-sm text-muted-foreground">Fechamento</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(closing.period_start), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(new Date(closing.period_end), "dd/MM/yyyy", { locale: ptBR })}
              </p>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Comissão total:</span>
                <span className="font-medium text-foreground">
                  R$ {closing.total_commission.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Já pago:</span>
                <span className="font-medium text-green-400">
                  R$ {closing.paid_amount.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pendente:</span>
                <span className="font-medium text-primary">
                  R$ {closing.pending_amount.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do pagamento *</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-muted/50 border-border"
              />
              {numericAmount > closing.pending_amount && (
                <p className="text-xs text-destructive">
                  O valor não pode exceder o saldo pendente
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="method">Método de pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-muted/50 border-border">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observation */}
            <div className="space-y-2">
              <Label htmlFor="observation">Observação</Label>
              <Textarea
                id="observation"
                placeholder="Observação opcional..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                className="bg-muted/50 border-border resize-none"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              "Confirmar Pagamento"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
