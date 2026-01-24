import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle2, Key, Loader2, Phone, Shield, Webhook, XCircle } from "lucide-react";
import { WhatsAppCredentials } from "@/hooks/useCompany";

interface MetaOfficialConfigProps {
  credentials?: WhatsAppCredentials;
  onSave: (businessId: string, phoneNumberId: string, token: string) => void;
  loading?: boolean;
}

export function MetaOfficialConfig({ credentials, onSave, loading }: MetaOfficialConfigProps) {
  const [businessId, setBusinessId] = useState(credentials?.meta_business_id || "");
  const [phoneNumberId, setPhoneNumberId] = useState(credentials?.meta_phone_number_id || "");
  const [token, setToken] = useState(credentials?.meta_token || "");
  const [hasChanges, setHasChanges] = useState(false);

  const isConnected = !!credentials?.meta_business_id && !!credentials?.meta_token;
  const webhookActive = credentials?.meta_webhook_active || false;

  const handleChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(businessId, phoneNumberId, token);
    setHasChanges(false);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-[hsl(var(--gold))]" />
          Configuração Meta Oficial
        </CardTitle>
        <CardDescription>
          Configure a API oficial do WhatsApp Business
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
              <p className="font-medium">Status da API</p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "API configurada" : "Configure suas credenciais"}
              </p>
            </div>
          </div>
          <Badge variant={isConnected ? "default" : "secondary"} className={isConnected ? "bg-green-500/20 text-green-500 border-green-500/30" : ""}>
            {isConnected ? "Configurado" : "Pendente"}
          </Badge>
        </div>

        {/* Webhook Status */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${webhookActive ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
              <Webhook className={`h-5 w-5 ${webhookActive ? 'text-green-500' : 'text-amber-500'}`} />
            </div>
            <div>
              <p className="font-medium">Status do Webhook</p>
              <p className="text-sm text-muted-foreground">
                {webhookActive ? "Recebendo mensagens" : "Aguardando configuração no Meta"}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className={webhookActive ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"}>
            {webhookActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>

        {/* Credentials Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta-business-id" className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Business ID
            </Label>
            <Input
              id="meta-business-id"
              placeholder="Digite o Business ID"
              value={businessId}
              onChange={(e) => handleChange(setBusinessId)(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-phone-id" className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number ID
            </Label>
            <Input
              id="meta-phone-id"
              placeholder="Digite o Phone Number ID"
              value={phoneNumberId}
              onChange={(e) => handleChange(setPhoneNumberId)(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta-token" className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              Access Token
            </Label>
            <Input
              id="meta-token"
              type="password"
              placeholder="Digite seu Access Token"
              value={token}
              onChange={(e) => handleChange(setToken)(e.target.value)}
              className="bg-secondary border-border"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-blue-400">
            <strong>Importante:</strong> Após salvar, configure o Webhook no Meta Business Suite apontando para sua URL de callback.
          </p>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          disabled={loading || !hasChanges || !businessId || !phoneNumberId || !token}
          className="w-full gold-gradient text-primary-foreground"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Salvar Credenciais
        </Button>
      </CardContent>
    </Card>
  );
}
