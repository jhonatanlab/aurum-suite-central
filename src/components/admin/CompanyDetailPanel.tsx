import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Building2, Calendar, User, CreditCard, MessageCircle, Wifi, WifiOff, Clock, Unlock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";


interface WhatsAppInstance {
  id: string;
  instance_id: string | null;
  phone_number: string | null;
  status: string;
  last_connected_at: string | null;
}

interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  plan: string | null;
  status: string | null;
  created_at: string;
  updated_at: string | null;
  last_access_at: string | null;
  whatsapp_settings: {
    api_provider?: string;
    connected?: boolean;
  } | null;
}

interface CompanyDetailPanelProps {
  company: Company | null;
  instance: WhatsAppInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestUnblock?: (company: Company) => void;
}

export function CompanyDetailPanel({ company, instance, open, onOpenChange, onRequestUnblock }: CompanyDetailPanelProps) {

  if (!company) return null;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Ativa</Badge>;
      case 'trial':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Trial</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspensa</Badge>;
      case 'canceled':
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelada</Badge>;
      case 'past_due':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Inadimplente</Badge>;
      case 'blocked':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Bloqueada</Badge>;
      case null:
      case undefined:
      case '':
        return <Badge variant="outline">Sem status</Badge>;
      default:
        return <Badge variant="outline">{String(status).charAt(0).toUpperCase() + String(status).slice(1)}</Badge>;
    }
  };


  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Pro</Badge>;
      case 'business':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Business</Badge>;
      case 'enterprise':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Enterprise</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const getPlanLimits = (plan: string | null) => {
    switch (plan) {
      case 'pro':
        return { users: 5, whatsapp: true };
      case 'business':
        return { users: 15, whatsapp: true };
      case 'enterprise':
        return { users: 'Ilimitado', whatsapp: true };
      default:
        return { users: 2, whatsapp: false };
    }
  };

  const limits = getPlanLimits(company.plan);
  const whatsappSettings = company.whatsapp_settings || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Building2 className="h-5 w-5 text-red-500" />
            {company.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados Básicos
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="text-sm font-medium text-foreground">{company.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">CNPJ</span>
                <span className="text-sm font-medium text-foreground">{company.cnpj || '-'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(company.status)}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Criação
                </span>
                <span className="text-sm font-medium text-foreground">
                  {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Último Acesso
                </span>
                <span className="text-sm font-medium text-foreground">
                  {company.last_access_at 
                    ? format(new Date(company.last_access_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : 'Nunca'}
                </span>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Plano */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Plano
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Plano Atual</span>
                {getPlanBadge(company.plan)}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Limite de Usuários
                </span>
                <span className="text-sm font-medium text-foreground">{limits.users}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">WhatsApp Incluso</span>
                <Badge variant={limits.whatsapp ? "default" : "outline"}>
                  {limits.whatsapp ? 'Sim' : 'Não'}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Status do WhatsApp */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Status do WhatsApp
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">API Ativa</span>
                <Badge variant={whatsappSettings.api_provider ? "default" : "outline"}>
                  {whatsappSettings.api_provider || 'Não configurada'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Instância Vinculada</span>
                <Badge variant={instance ? "default" : "outline"}>
                  {instance ? `ID: ${instance.instance_id?.slice(0, 8) || 'N/A'}...` : 'Nenhuma'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                <span className="text-sm text-muted-foreground">Status da Conexão</span>
                <div className="flex items-center gap-2">
                  {instance?.status === 'connected' ? (
                    <>
                      <Wifi className="h-4 w-4 text-emerald-500" />
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        Conectado
                      </Badge>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">Desconectado</Badge>
                    </>
                  )}
                </div>
              </div>
              {instance?.phone_number && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Número</span>
                  <span className="text-sm font-medium text-foreground">{instance.phone_number}</span>
                </div>
              )}
              {instance?.last_connected_at && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Última Conexão</span>
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(instance.last_connected_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}