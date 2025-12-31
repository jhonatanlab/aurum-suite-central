import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Kanban } from "lucide-react";
import { useCrmSettings } from "@/hooks/useCrmSettings";
import { useToast } from "@/hooks/use-toast";

export function CrmSettingsPanel() {
  const { settings, updateSettings, isUpdating } = useCrmSettings();
  const { toast } = useToast();

  const handleToggle = (key: "enable_sales_column" | "auto_move_to_sales", value: boolean) => {
    updateSettings(
      { [key]: value },
      {
        onSuccess: () => {
          toast({ title: "Configuração atualizada!" });
        },
        onError: (error: Error) => {
          toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <Card className="card-premium">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gold/10">
            <Kanban className="h-5 w-5 text-gold" />
          </div>
          <div>
            <CardTitle>Configurações do CRM</CardTitle>
            <CardDescription>Personalize o comportamento do funil de vendas</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enable_sales_column" className="text-base">
              Ativar Coluna de Vendas
            </Label>
            <p className="text-sm text-muted-foreground">
              Exibe uma coluna "Ganho/Vendas" fixa no CRM
            </p>
          </div>
          <Switch
            id="enable_sales_column"
            checked={settings.enable_sales_column}
            onCheckedChange={(checked) => handleToggle("enable_sales_column", checked)}
            disabled={isUpdating}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto_move_to_sales" className="text-base">
              Mover automaticamente para Vendas
            </Label>
            <p className="text-sm text-muted-foreground">
              Move o lead para a coluna de vendas quando marcado como "Venda Concluída"
            </p>
          </div>
          <Switch
            id="auto_move_to_sales"
            checked={settings.auto_move_to_sales}
            onCheckedChange={(checked) => handleToggle("auto_move_to_sales", checked)}
            disabled={isUpdating || !settings.enable_sales_column}
          />
        </div>
      </CardContent>
    </Card>
  );
}
