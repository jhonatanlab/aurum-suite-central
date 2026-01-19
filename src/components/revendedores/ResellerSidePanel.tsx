import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Reseller,
  ResellerFormData,
  useResellers,
  useResellerHistory,
} from "@/hooks/useResellers";
import { DocumentUpload } from "./DocumentUpload";
import { Loader2, History, User } from "lucide-react";

interface ResellerSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reseller: Reseller | null;
}

export function ResellerSidePanel({
  open,
  onOpenChange,
  reseller,
}: ResellerSidePanelProps) {
  const { createReseller, updateReseller } = useResellers();
  const { data: history = [], isLoading: historyLoading } = useResellerHistory(
    reseller?.id || null
  );

  const [formData, setFormData] = useState<ResellerFormData>({
    name: "",
    document: "",
    phone: "",
    email: "",
    commission_type: "percent",
    commission_value: 0,
    status: "active",
  });

  useEffect(() => {
    if (reseller) {
      setFormData({
        name: reseller.name,
        document: reseller.document || "",
        phone: reseller.phone || "",
        email: reseller.email || "",
        commission_type: reseller.commission_type,
        commission_value: reseller.commission_value,
        status: reseller.status,
      });
    } else {
      setFormData({
        name: "",
        document: "",
        phone: "",
        email: "",
        commission_type: "percent",
        commission_value: 0,
        status: "active",
      });
    }
  }, [reseller, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (reseller) {
      await updateReseller.mutateAsync({
        id: reseller.id,
        data: formData,
        oldStatus: reseller.status,
      });
    } else {
      await createReseller.mutateAsync(formData);
    }
    onOpenChange(false);
  };

  const isSubmitting = createReseller.isPending || updateReseller.isPending;

  const getActionLabel = (action: string) => {
    const labels: Record<string, { text: string; variant: "default" | "secondary" | "outline" }> = {
      created: { text: "Criado", variant: "default" },
      updated: { text: "Editado", variant: "secondary" },
      activated: { text: "Ativado", variant: "default" },
      deactivated: { text: "Inativado", variant: "outline" },
      document_uploaded: { text: "Documento", variant: "secondary" },
      document_deleted: { text: "Documento", variant: "outline" },
    };
    return labels[action] || { text: action, variant: "secondary" as const };
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">
            {reseller ? "Editar Revendedor" : "Novo Revendedor"}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="dados" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dados" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="flex items-center gap-2"
              disabled={!reseller}
            >
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome do revendedor"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document">Documento (CPF/CNPJ)</Label>
                <Input
                  id="document"
                  value={formData.document}
                  onChange={(e) =>
                    setFormData({ ...formData, document: e.target.value })
                  }
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Comissão</Label>
                  <Select
                    value={formData.commission_type}
                    onValueChange={(value: "percent" | "fixed") =>
                      setFormData({ ...formData, commission_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission_value">
                    Valor da Comissão{" "}
                    {formData.commission_type === "percent" ? "(%)" : "(R$)"}
                  </Label>
                  <Input
                    id="commission_value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.commission_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        commission_value: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "active" | "inactive") =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="my-4" />

              <DocumentUpload resellerId={reseller?.id || null} />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isSubmitting || !formData.name.trim()}
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {reseller ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="historico" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum histórico encontrado
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => {
                    const actionInfo = getActionLabel(item.action);
                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-border bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={actionInfo.variant}>
                            {actionInfo.text}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {item.description}
                        </p>
                        {item.created_by && (
                          <p className="text-xs text-muted-foreground mt-1">
                            por {item.created_by}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
