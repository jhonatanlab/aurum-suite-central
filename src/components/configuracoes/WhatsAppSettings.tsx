import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, History, CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { useWhatsAppSettings, WhatsAppApiProvider } from "@/hooks/useWhatsAppSettings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UazapiConfig } from "./UazapiConfig";
import { ZapiConfig } from "./ZapiConfig";
import { MetaOfficialConfig } from "./MetaOfficialConfig";

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
  const { 
    settings, 
    loading, 
    saving, 
    testResult,
    isConnected,
    updateApiProvider,
    connectUazapi,
    disconnectUazapi,
    saveZapiCredentials,
    testZapiConnection,
    saveMetaCredentials,
  } = useWhatsAppSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  const recentHistory = settings.api_history.slice(-5).reverse();
  const currentApiLabel = API_OPTIONS.find(opt => opt.value === settings.api_provider)?.label || settings.api_provider;

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      <Card className={`border-2 ${isConnected ? 'border-green-500/50 bg-green-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                {isConnected ? (
                  <Wifi className="h-6 w-6 text-green-500" />
                ) : (
                  <WifiOff className="h-6 w-6 text-amber-500" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isConnected ? 'WhatsApp Conectado' : 'WhatsApp Desconectado'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected 
                    ? `Usando ${currentApiLabel} • Pronto para enviar e receber mensagens`
                    : `Configure o ${currentApiLabel} abaixo para conectar`
                  }
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={`text-sm px-4 py-1 ${
                isConnected 
                  ? 'border-green-500 text-green-500 bg-green-500/10' 
                  : 'border-amber-500 text-amber-500 bg-amber-500/10'
              }`}
            >
              {isConnected ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </CardContent>
      </Card>

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

      {/* API-Specific Configuration */}
      {settings.api_provider === 'uazapi' && (
        <UazapiConfig
          credentials={settings.credentials}
          onConnect={connectUazapi}
          onDisconnect={disconnectUazapi}
          loading={saving}
        />
      )}

      {settings.api_provider === 'zapi' && (
        <ZapiConfig
          credentials={settings.credentials}
          onSave={saveZapiCredentials}
          onTest={testZapiConnection}
          loading={saving}
          testResult={testResult}
        />
      )}

      {settings.api_provider === 'meta_oficial' && (
        <MetaOfficialConfig
          credentials={settings.credentials}
          onSave={saveMetaCredentials}
          loading={saving}
        />
      )}

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
