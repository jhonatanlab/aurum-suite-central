import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Trash2, 
  CreditCard, 
  Wallet,
  AlertCircle,
  Percent
} from "lucide-react";
import { usePaymentGateways, PaymentGateway } from "@/hooks/usePaymentGateways";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

export interface PaymentEntry {
  id: string;
  method: string;
  amount: number;
  installments: number;
  gatewayId: string | null;
  interestRatePercent: number;
  interestAmount: number;
  gatewayFeePercent: number;
  gatewayFeeAmount: number;
  passToCustomer: boolean;
}

interface MultiPaymentManagerProps {
  totalDue: number;
  onPaymentsChange: (payments: PaymentEntry[]) => void;
  onTotalPaidChange: (totalPaid: number, pendingBalance: number) => void;
  onCostsChange: (costs: { type: string; description: string; amount: number }[]) => void;
  onInterestToCustomer: (interestAmount: number) => void;
}

const paymentMethods = [
  { value: "pix", label: "PIX" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão Crédito" },
  { value: "cartao_debito", label: "Cartão Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferência" },
];

export function MultiPaymentManager({
  totalDue,
  onPaymentsChange,
  onTotalPaidChange,
  onCostsChange,
  onInterestToCustomer,
}: MultiPaymentManagerProps) {
  const { activeGateways, calculateGatewayInterest, getMaxInstallments } = usePaymentGateways();
  const { settings } = usePaymentSettings();
  
  const [payments, setPayments] = useState<PaymentEntry[]>([]);

  const addPayment = () => {
    const remainingAmount = totalDue - payments.reduce((sum, p) => sum + p.amount, 0);
    const newPayment: PaymentEntry = {
      id: crypto.randomUUID(),
      method: "pix",
      amount: Math.max(0, remainingAmount),
      installments: 1,
      gatewayId: null,
      interestRatePercent: 0,
      interestAmount: 0,
      gatewayFeePercent: 0,
      gatewayFeeAmount: 0,
      passToCustomer: false,
    };
    const newPayments = [...payments, newPayment];
    setPayments(newPayments);
    recalculateAll(newPayments);
  };

  const removePayment = (id: string) => {
    const newPayments = payments.filter(p => p.id !== id);
    setPayments(newPayments);
    recalculateAll(newPayments);
  };

  const updatePayment = (id: string, field: keyof PaymentEntry, value: any) => {
    const newPayments = payments.map(p => {
      if (p.id !== id) return p;
      
      const updated = { ...p, [field]: value };
      
      // Get the gateway
      const gatewayId = field === "gatewayId" ? value : p.gatewayId;
      const gateway = activeGateways.find(g => g.id === gatewayId);
      const amount = field === "amount" ? value : p.amount;
      const installments = field === "installments" ? value : p.installments;
      
      // Recalculate interest when installments, amount, or gateway changes
      if (field === "installments" || field === "amount" || field === "gatewayId") {
        if (gateway) {
          const { interestAmount, passToCustomer } = calculateGatewayInterest(
            gateway,
            amount,
            installments,
            settings.interest_starts_at
          );
          
          // Find the rule to get the rate
          const rule = gateway.installment_rules.find(r => r.installments === installments);
          updated.interestRatePercent = rule?.interest_rate_percent || 0;
          updated.interestAmount = interestAmount;
          updated.passToCustomer = passToCustomer;
        } else {
          updated.interestRatePercent = 0;
          updated.interestAmount = 0;
          updated.passToCustomer = false;
        }
      }
      
      // Recalculate gateway fee when gateway or amount changes
      if (field === "gatewayId" || field === "amount") {
        if (gateway) {
          updated.gatewayFeePercent = gateway.service_fee_percent;
          updated.gatewayFeeAmount = amount * (gateway.service_fee_percent / 100);
        } else {
          updated.gatewayFeePercent = 0;
          updated.gatewayFeeAmount = 0;
        }
      }
      
      // Reset installments if not credit card or if gateway changes
      if (field === "method" && value !== "cartao_credito") {
        updated.installments = 1;
        updated.interestAmount = 0;
        updated.interestRatePercent = 0;
        updated.passToCustomer = false;
      }

      // Reset installments if gateway changes
      if (field === "gatewayId") {
        updated.installments = 1;
        updated.interestAmount = 0;
        updated.interestRatePercent = 0;
        updated.passToCustomer = false;
      }
      
      return updated;
    });
    
    setPayments(newPayments);
    recalculateAll(newPayments);
  };

  const recalculateAll = (paymentsList: PaymentEntry[]) => {
    // Calculate totals
    const totalPaid = paymentsList.reduce((sum, p) => sum + p.amount, 0);
    const pendingBalance = Math.max(0, totalDue - totalPaid);
    
    // Calculate costs (interest not passed to customer + gateway fees)
    const costs: { type: string; description: string; amount: number }[] = [];
    let interestToCustomer = 0;
    
    paymentsList.forEach(p => {
      // Check if interest should be passed to customer
      if (p.interestAmount > 0) {
        if (p.passToCustomer) {
          interestToCustomer += p.interestAmount;
        } else {
          const gateway = activeGateways.find(g => g.id === p.gatewayId);
          costs.push({
            type: "interest",
            description: `Juros ${p.installments}x - ${gateway?.name || "Gateway"}`,
            amount: p.interestAmount,
          });
        }
      }
      
      // Gateway fees are always a cost
      if (p.gatewayFeeAmount > 0) {
        const gateway = activeGateways.find(g => g.id === p.gatewayId);
        costs.push({
          type: "gateway_fee",
          description: `Taxa ${gateway?.name || "Gateway"} (${p.gatewayFeePercent}%)`,
          amount: p.gatewayFeeAmount,
        });
      }
    });
    
    onPaymentsChange(paymentsList);
    onTotalPaidChange(totalPaid, pendingBalance);
    onCostsChange(costs);
    onInterestToCustomer(interestToCustomer);
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const pendingBalance = Math.max(0, totalDue - totalPaid);
  const totalCosts = payments.reduce((sum, p) => sum + p.gatewayFeeAmount, 0);
  const totalInterestNotPassed = payments.reduce((sum, p) => {
    return sum + (p.passToCustomer ? 0 : p.interestAmount);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getInstallmentOptions = (payment: PaymentEntry): { value: number; label: string; interestAmount: number }[] => {
    const gateway = activeGateways.find(g => g.id === payment.gatewayId);
    if (!gateway || gateway.installment_rules.length === 0) {
      return [{ value: 1, label: "1x (sem juros)", interestAmount: 0 }];
    }

    return gateway.installment_rules
      .sort((a, b) => a.installments - b.installments)
      .map(rule => {
        const { interestAmount, passToCustomer } = calculateGatewayInterest(
          gateway,
          payment.amount,
          rule.installments,
          settings.interest_starts_at
        );

        // Show rate info even when amount is 0, so user knows which installments have interest
        const hasInterestRule = rule.installments >= settings.interest_starts_at && rule.interest_rate_percent > 0;
        
        let label: string;
        if (interestAmount > 0) {
          label = `${rule.installments}x (+${formatCurrency(interestAmount)}${passToCustomer ? "" : " custo"})`;
        } else if (hasInterestRule && payment.amount === 0) {
          label = `${rule.installments}x (${rule.interest_rate_percent}% juros${rule.pass_to_customer ? "" : " custo"})`;
        } else {
          label = `${rule.installments}x (sem juros)`;
        }

        return {
          value: rule.installments,
          label,
          interestAmount,
        };
      });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Pagamentos
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPayment}
          className="h-8"
        >
          <Plus className="h-3 w-3 mr-1" />
          Adicionar
        </Button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-lg">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum pagamento adicionado</p>
          <p className="text-xs">Clique em "Adicionar" para registrar pagamentos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <Card key={payment.id} className="bg-card/50 border-border">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    Pagamento {index + 1}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => removePayment(payment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Forma</Label>
                    <Select
                      value={payment.method}
                      onValueChange={(value) => updatePayment(payment.id, "method", value)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                        <SelectValue />
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

                  <div className="space-y-1">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={payment.amount || ""}
                      onChange={(e) => updatePayment(payment.id, "amount", parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs bg-secondary border-border"
                    />
                  </div>
                </div>

                {payment.method === "cartao_credito" && activeGateways.length > 0 && (
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Gateway / Maquininha</Label>
                      <Select
                        value={payment.gatewayId || "none"}
                        onValueChange={(value) => updatePayment(payment.id, "gatewayId", value === "none" ? null : value)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Selecione um gateway</SelectItem>
                          {activeGateways.map((gateway) => (
                            <SelectItem key={gateway.id} value={gateway.id}>
                              {gateway.name} (taxa: {gateway.service_fee_percent}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {payment.gatewayId && (
                      <div className="space-y-1">
                        <Label className="text-xs">Parcelas</Label>
                        <Select
                          value={payment.installments.toString()}
                          onValueChange={(value) => updatePayment(payment.id, "installments", parseInt(value))}
                        >
                          <SelectTrigger className="h-8 text-xs bg-secondary border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getInstallmentOptions(payment).map((option) => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}

                {payment.method === "cartao_credito" && activeGateways.length === 0 && (
                  <div className="text-xs text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Configure gateways em Meu Negócio → Pagamentos
                  </div>
                )}

                {(payment.interestAmount > 0 || payment.gatewayFeeAmount > 0) && (
                  <div className="text-xs space-y-1 pt-2 border-t border-border">
                    {payment.interestAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Juros ({payment.interestRatePercent}%)
                          {!payment.passToCustomer && (
                            <Badge variant="secondary" className="text-[10px] px-1">custo</Badge>
                          )}
                        </span>
                        <span>{formatCurrency(payment.interestAmount)}</span>
                      </div>
                    )}
                    {payment.gatewayFeeAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Taxa Gateway ({payment.gatewayFeePercent}%)</span>
                        <span>{formatCurrency(payment.gatewayFeeAmount)}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {payments.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Pago</span>
            <span className={totalPaid >= totalDue ? "text-green-500" : "text-foreground"}>
              {formatCurrency(totalPaid)}
            </span>
          </div>
          
          {pendingBalance > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-500" />
                Saldo Pendente
              </span>
              <span className="text-amber-500">{formatCurrency(pendingBalance)}</span>
            </div>
          )}

          {(totalCosts + totalInterestNotPassed) > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Custos da Venda</span>
              <span className="text-destructive">{formatCurrency(totalCosts + totalInterestNotPassed)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}