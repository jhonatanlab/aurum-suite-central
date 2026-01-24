import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Key, Loader2, Server, TestTube, XCircle } from "lucide-react";
import { WhatsAppCredentials } from "@/hooks/useCompany";

interface ZapiConfigProps {
  credentials?: WhatsAppCredentials;
  onSave: (token: string, instance: string) => void;
  onTest: () => void;
  loading?: boolean;
  testResult?: 'success' | 'error' | null;
}

export function ZapiConfig({ credentials, onSave, onTest, loading, testResult }: ZapiConfigProps) {
  const [token, setToken] = useState(credentials?.zapi_token || "");
  const [instance, setInstance] = useState(credentials?.zapi_instance || "");
  const [hasChanges, setHasChanges] = useState(false);

  const isConnected = credentials?.zapi_connected || false;

  const handleTokenChange = (value: string) => {
    setToken(value);
    setHasChanges(true);
  };

  const handleInstanceChange = (value: string) => {
    setInstance(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(token, instance);
    setHasChanges(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Server className="h-5 w-5 text-[hsl(var(--gold))]" />
          Configuração Z-Api
        </CardTitle>
        <CardDescription>
          Configure suas credenciais da Z-Api para integração
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium">Status da Conexão</p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "API conectada e funcionando" : "Configure e teste a conexão"}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
            {isConnected ? "Conectado" : "Desconectado"}
          </Badge>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zapi-instance" className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              Instância
            </Label>
            <Input
              id="zapi-instance"
              placeholder="Digite o ID da instância"
              value={instance}
              onChange={(e) => handleInstanceChange(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-token" className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              Token
            </Label>
            <Input
              id="zapi-token"
              type="password"
              placeholder="Digite seu token de acesso"
              value={token}
              onChange={(e) => handleTokenChange(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`flex items-center gap-2 p-3 rounded-lg ${
            testResult === 'success' 
              ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
              : 'bg-destructive/10 text-destructive border border-destructive/30'
          }`}>
            {testResult === 'success' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Conexão testada com sucesso!</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Falha na conexão. Verifique suas credenciais.</span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={onTest}
            disabled={loading || !token || !instance}
            className="flex-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4 mr-2" />
            )}
            Testar Conexão
          </Button>
          <Button 
            onClick={handleSave}
            disabled={loading || !hasChanges || !token || !instance}
            className="flex-1 gold-gradient text-primary-foreground"
          >
            Salvar Credenciais
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
