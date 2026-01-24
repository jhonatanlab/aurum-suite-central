import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, History, CheckCircle2 } from "lucide-react";
import { useWhatsAppSettings, WhatsAppApiProvider } from "@/hooks/useWhatsAppSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const API_OPTIONS = [
  {
    value: 'uazapi' as WhatsAppApiProvider,
    label: 'Uazapi',
    description: 'API brasileira com suporte completo a recursos avançados',
  },
  {
    value: 'zapi' as WhatsAppApiProvider,
    label: 'Z-Api',
    description: 'Solução robusta com alta disponibilidade',
  },
  {
    value: 'meta_oficial' as WhatsAppApiProvider,
    label: 'Meta Oficial',
    description: 'API oficial da Meta (WhatsApp Business)',
  },
];

export function WhatsAppSettings() {
  const { settings, loading, saving, updateApiProvider } = useWhatsAppSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  const recentHistory = settings.api_history.slice(-5).reverse();

  return (
    <div className="space-y-6">
      {/* API Selector */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MessageCircle className="h-5 w-5 text-[hsl(var(--gold))]" />
            Provedor de API WhatsApp
          </CardTitle>
          <CardDescription>
            Escolha o provedor de API para integração com WhatsApp. Apenas uma API pode estar ativa por vez.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.api_provider}
            onValueChange={(value) => updateApiProvider(value as WhatsAppApiProvider)}
            disabled={saving}
            className="space-y-4"
          >
            {API_OPTIONS.map((option) => (
              <div
                key={option.value}
                className={`flex items-start space-x-4 rounded-xl border p-4 transition-all duration-200 ${
                  settings.api_provider === option.value
                    ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/5'
                    : 'border-border hover:border-muted-foreground/50 hover:bg-secondary/50'
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 text-base font-medium cursor-pointer"
                  >
                    {option.label}
                    {settings.api_provider === option.value && (
                      <Badge variant="outline" className="border-[hsl(var(--gold))] text-[hsl(var(--gold))]">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Ativo
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>

          {saving && (
            <p className="text-sm text-muted-foreground mt-4 animate-pulse">
              Salvando configuração...
            </p>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {recentHistory.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Histórico de Alterações
            </CardTitle>
            <CardDescription>
              Últimas alterações no provedor de API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentHistory.map((entry, index) => {
                const apiLabel = API_OPTIONS.find(opt => opt.value === entry.provider)?.label || entry.provider;
                const isActive = !entry.deactivated_at;

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isActive ? 'border-[hsl(var(--gold))]/30 bg-[hsl(var(--gold))]/5' : 'border-border bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                      <span className="font-medium">{apiLabel}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {isActive ? (
                        <span>
                          Ativado em {format(new Date(entry.activated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      ) : (
                        <span>
                          {format(new Date(entry.activated_at), "dd/MM/yyyy", { locale: ptBR })} - {format(new Date(entry.deactivated_at!), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
