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
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { usePaymentGateways, PaymentGateway } from "@/hooks/usePaymentGateways";

const gatewayTypes = [
  { value: "card_machine", label: "Maquininha" },
  { value: "online_gateway", label: "Gateway Online" },
  { value: "bank", label: "Banco" },
];

export function PaymentSettingsPanel() {
  const { settings, updateSettings, isLoading } = usePaymentSettings();
  const { gateways, createGateway, updateGateway, deleteGateway, isLoading: gatewaysLoading } = usePaymentGateways();
  
  const [isGatewayDialogOpen, setIsGatewayDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [gatewayForm, setGatewayForm] = useState({
    name: "",
    type: "card_machine",
    service_fee_percent: "0",
    active: true,
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
      });
    } else {
      setEditingGateway(null);
      setGatewayForm({
        name: "",
        type: "card_machine",
        service_fee_percent: "0",
        active: true,
      });
    }
    setIsGatewayDialogOpen(true);
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
      {/* Configurações de Parcelamento */}
      <Card className="card-premium">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Percent className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Parcelamento</CardTitle>
              <CardDescription>Configure as regras de parcelamento e juros</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Máximo de Parcelas</Label>
              <Select
                value={settings.max_installments.toString()}
                onValueChange={(value) => handleUpdateSettings({ max_installments: parseInt(value) })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Taxa de Juros (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={settings.interest_rate_percent}
                onChange={(e) => handleUpdateSettings({ interest_rate_percent: parseFloat(e.target.value) || 0 })}
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label>Aplicar Juros a partir de</Label>
              <Select
                value={settings.interest_starts_at.toString()}
                onValueChange={(value) => handleUpdateSettings({ interest_starts_at: parseInt(value) })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Repassar Taxa ao Cliente</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {settings.pass_interest_to_customer 
                  ? "Os juros serão adicionados ao total da venda"
                  : "Os juros serão registrados como custo da venda"}
              </p>
            </div>
            <Switch
              checked={settings.pass_interest_to_customer}
              onCheckedChange={(checked) => handleUpdateSettings({ pass_interest_to_customer: checked })}
            />
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
                <CardDescription>Configure as taxas por método de pagamento</CardDescription>
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingGateway ? "Editar Gateway" : "Novo Gateway"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure as informações do gateway ou maquininha
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                  <div className="space-y-2">
                    <Label>Taxa de Serviço (%)</Label>
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
                      Taxa cobrada pelo gateway em cada transação
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Ativo</Label>
                    <Switch
                      checked={gatewayForm.active}
                      onCheckedChange={(checked) => setGatewayForm({ ...gatewayForm, active: checked })}
                    />
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Taxa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((gateway) => (
                  <TableRow key={gateway.id}>
                    <TableCell className="font-medium">{gateway.name}</TableCell>
                    <TableCell>
                      {gatewayTypes.find(t => t.value === gateway.type)?.label || gateway.type}
                    </TableCell>
                    <TableCell>{gateway.service_fee_percent}%</TableCell>
                    <TableCell>
                      <Badge variant={gateway.active ? "default" : "secondary"}>
                        {gateway.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
