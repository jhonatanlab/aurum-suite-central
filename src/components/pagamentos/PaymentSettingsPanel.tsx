import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  Plus, 
  Pencil, 
  Trash2, 
  Percent, 
  Settings2, 
  Loader2,
  Wallet,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { usePaymentGateways, PaymentGateway, InstallmentRule } from "@/hooks/usePaymentGateways";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const gatewayTypes = [
  { value: "card_machine", label: "Maquininha" },
  { value: "online_gateway", label: "Gateway Online" },
  { value: "bank", label: "Banco" },
];

interface InstallmentRuleForm {
  installments: number;
  interest_rate_percent: string;
  pass_to_customer: boolean;
}

export function PaymentSettingsPanel() {
  const { settings, updateSettings, isLoading } = usePaymentSettings();
  const { gateways, createGateway, updateGateway, deleteGateway, isLoading: gatewaysLoading } = usePaymentGateways();
  
  const [isGatewayDialogOpen, setIsGatewayDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [expandedGateway, setExpandedGateway] = useState<string | null>(null);
  const [gatewayForm, setGatewayForm] = useState({
    name: "",
    type: "card_machine",
    service_fee_percent: "0",
    active: true,
    installment_rules: [] as InstallmentRuleForm[],
  });

  const handleUpdateSettings = async (updates: Partial<typeof settings>) => {
    try {
      await updateSettings.mutateAsync(updates);
      toast.success("Configurações salvas!");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleOpenGatewayDialog = (gateway?: PaymentGateway) => {
    if (gateway) {
      setEditingGateway(gateway);
      setGatewayForm({
        name: gateway.name,
        type: gateway.type,
        service_fee_percent: gateway.service_fee_percent.toString(),
        active: gateway.active,
        installment_rules: gateway.installment_rules.map(r => ({
          installments: r.installments,
          interest_rate_percent: r.interest_rate_percent.toString(),
          pass_to_customer: r.pass_to_customer,
        })),
      });
    } else {
      setEditingGateway(null);
      setGatewayForm({
        name: "",
        type: "card_machine",
        service_fee_percent: "0",
        active: true,
        installment_rules: [],
      });
    }
    setIsGatewayDialogOpen(true);
  };

  const addInstallmentRule = () => {
    const existingInstallments = gatewayForm.installment_rules.map(r => r.installments);
    let nextInstallment = 1;
    while (existingInstallments.includes(nextInstallment) && nextInstallment <= 24) {
      nextInstallment++;
    }
    
    setGatewayForm({
      ...gatewayForm,
      installment_rules: [
        ...gatewayForm.installment_rules,
        { installments: nextInstallment, interest_rate_percent: "0", pass_to_customer: true },
      ].sort((a, b) => a.installments - b.installments),
    });
  };

  const updateInstallmentRule = (index: number, field: keyof InstallmentRuleForm, value: any) => {
    const newRules = [...gatewayForm.installment_rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setGatewayForm({
      ...gatewayForm,
      installment_rules: newRules.sort((a, b) => a.installments - b.installments),
    });
  };

  const removeInstallmentRule = (index: number) => {
    setGatewayForm({
      ...gatewayForm,
      installment_rules: gatewayForm.installment_rules.filter((_, i) => i !== index),
    });
  };

  const handleSaveGateway = async () => {
    if (!gatewayForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const data = {
        name: gatewayForm.name.trim(),
        type: gatewayForm.type,
        service_fee_percent: parseFloat(gatewayForm.service_fee_percent) || 0,
        active: gatewayForm.active,
        installment_rules: gatewayForm.installment_rules.map(r => ({
          installments: r.installments,
          interest_rate_percent: parseFloat(r.interest_rate_percent) || 0,
          pass_to_customer: r.pass_to_customer,
        })),
      };

      if (editingGateway) {
        await updateGateway.mutateAsync({ id: editingGateway.id, ...data });
        toast.success("Gateway atualizado!");
      } else {
        await createGateway.mutateAsync(data);
        toast.success("Gateway criado!");
      }

      setIsGatewayDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar gateway");
    }
  };

  const handleDeleteGateway = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este gateway?")) return;
    
    try {
      await deleteGateway.mutateAsync(id);
      toast.success("Gateway excluído!");
    } catch (error) {
      toast.error("Erro ao excluir gateway");
    }
  };

  if (isLoading || gatewaysLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuração Global */}
      <Card className="card-premium">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Configuração Global</CardTitle>
              <CardDescription>Regra aplicada a todos os gateways</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Aplicar Juros a partir de</Label>
            <Select
              value={settings.interest_starts_at.toString()}
              onValueChange={(value) => handleUpdateSettings({ interest_starts_at: parseInt(value) })}
            >
              <SelectTrigger className="bg-secondary border-border w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}x parcela{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Mesmo após atingir esse número, os juros só serão cobrados se a parcela específica tiver "Repassar taxa ao cliente" ativado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gateways / Maquininhas */}
      <Card className="card-premium">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Gateways / Maquininhas</CardTitle>
                <CardDescription>Configure taxas e parcelamento por método</CardDescription>
              </div>
            </div>
            <Dialog open={isGatewayDialogOpen} onOpenChange={setIsGatewayDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => handleOpenGatewayDialog()}
                  className="gold-gradient"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingGateway ? "Editar Gateway" : "Novo Gateway"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure as informações e regras de parcelamento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        placeholder="Ex: PagSeguro, Stone, Cielo..."
                        value={gatewayForm.name}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, name: e.target.value })}
                        className="bg-secondary border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={gatewayForm.type}
                        onValueChange={(value) => setGatewayForm({ ...gatewayForm, type: value })}
                      >
                        <SelectTrigger className="bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {gatewayTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Taxa de Transação (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={gatewayForm.service_fee_percent}
                        onChange={(e) => setGatewayForm({ ...gatewayForm, service_fee_percent: e.target.value })}
                        className="bg-secondary border-border"
                      />
                      <p className="text-xs text-muted-foreground">
                        Taxa fixa cobrada em todas as transações (custo de venda)
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-6">
                      <Label>Ativo</Label>
                      <Switch
                        checked={gatewayForm.active}
                        onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, active: checked })}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Installment Rules */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Tabela de Parcelamento</Label>
                        <p className="text-sm text-muted-foreground">
                          Configure a taxa de juros para cada número de parcelas
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addInstallmentRule}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Parcela
                      </Button>
                    </div>

                    {gatewayForm.installment_rules.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-border rounded-lg">
                        <Percent className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">Nenhuma regra de parcela configurada</p>
                        <p className="text-xs text-muted-foreground">Clique em "Adicionar Parcela" para configurar</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {gatewayForm.installment_rules.map((rule, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border"
                          >
                            <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                              <div className="space-y-1">
                                <Label className="text-xs">Parcelas</Label>
                                <Select
                                  value={rule.installments.toString()}
                                  onValueChange={(value) => updateInstallmentRule(index, "installments", parseInt(value))}
                                >
                                  <SelectTrigger className="h-8 text-sm bg-background border-border">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                                      <SelectItem 
                                        key={n} 
                                        value={n.toString()}
                                        disabled={gatewayForm.installment_rules.some((r, i) => i !== index && r.installments === n)}
                                      >
                                        {n}x
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Taxa (%)</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={rule.interest_rate_percent}
                                  onChange={(e) => updateInstallmentRule(index, "interest_rate_percent", e.target.value)}
                                  className="h-8 text-sm bg-background border-border"
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-4">
                                <Switch
                                  checked={rule.pass_to_customer}
                                  onCheckedChange={(checked) => updateInstallmentRule(index, "pass_to_customer", checked)}
                                  className="scale-90"
                                />
                                <Label className="text-xs">Repassar</Label>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeInstallmentRule(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsGatewayDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveGateway}
                    disabled={createGateway.isPending || updateGateway.isPending}
                    className="gold-gradient"
                  >
                    {(createGateway.isPending || updateGateway.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {gateways.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum gateway cadastrado</p>
              <p className="text-sm">Adicione maquininhas ou gateways para registrar taxas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gateways.map((gateway) => (
                <Collapsible
                  key={gateway.id}
                  open={expandedGateway === gateway.id}
                  onOpenChange={(open) => setExpandedGateway(open ? gateway.id : null)}
                >
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-secondary/30">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            {expandedGateway === gateway.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{gateway.name}</span>
                            <Badge variant={gateway.active ? "default" : "secondary"} className="text-xs">
                              {gateway.active ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{gatewayTypes.find(t => t.value === gateway.type)?.label}</span>
                            <span>•</span>
                            <span>Taxa transação: {gateway.service_fee_percent}%</span>
                            <span>•</span>
                            <span>Até {gateway.installment_rules.length > 0 ? Math.max(...gateway.installment_rules.map(r => r.installments)) : 1}x</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenGatewayDialog(gateway)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGateway(gateway.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="p-4 border-t border-border">
                        {gateway.installment_rules.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            Nenhuma regra de parcelamento configurada
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Parcelas</TableHead>
                                <TableHead>Taxa de Juros</TableHead>
                                <TableHead>Repassar ao Cliente</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {gateway.installment_rules
                                .sort((a, b) => a.installments - b.installments)
                                .map((rule, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-medium">{rule.installments}x</TableCell>
                                    <TableCell>{rule.interest_rate_percent}%</TableCell>
                                    <TableCell>
                                      <Badge variant={rule.pass_to_customer ? "default" : "secondary"}>
                                        {rule.pass_to_customer ? "Sim" : "Não"}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}