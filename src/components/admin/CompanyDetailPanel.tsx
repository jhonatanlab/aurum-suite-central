import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Calendar,
  User,
  CreditCard,
  MessageCircle,
  Wifi,
  WifiOff,
  Clock,
  Unlock,
  Mail,
  Phone,
  Users,
  BarChart3,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CompanyDetails {
  owner: {
    id: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
  } | null;
  members: Array<{
    user_id: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    full_name: string | null;
    last_sign_in_at: string | null;
  }>;
  usage: { products: number; sales: number; leads: number; resellers: number; users: number };
  limits: { max_users: number; max_products: number; max_resellers: number };
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário",
  manager: "Gerente",
  gerente: "Gerente",
  seller: "Vendedor",
  vendedor: "Vendedor",
};

const formatLimit = (value: number) => (value >= 999 ? "Ilimitado" : String(value));



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
  onRequestDelete?: (company: Company, usage: CompanyDetails["usage"] | null) => void;
}

export function CompanyDetailPanel({ company, instance, open, onOpenChange, onRequestUnblock, onRequestDelete }: CompanyDetailPanelProps) {
  const [details, setDetails] = useState<CompanyDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { toast } = useToast();
  const companyId = company?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    if (!open || !companyId) {
      setDetails(null);
      return;
    }
    setDetailsLoading(true);
    supabase.functions
      .invoke("admin-company-details", { body: { company_id: companyId } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || (data as { error?: string } | null)?.error) {
          console.error("admin-company-details", error || data);
          setDetails(null);
        } else {
          setDetails(data as CompanyDetails);
        }
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, companyId]);

  const copyValue = (value: string | null, label: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copiado`, description: value });
  };

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

        {company.status && company.status !== 'active' && company.status !== 'trial' && onRequestUnblock && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="text-sm">
              <p className="font-medium text-foreground">Empresa com acesso bloqueado</p>
              <p className="text-xs text-muted-foreground">Libere manualmente o acesso sem esperar renovação.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onRequestUnblock(company)}
            >
              <Unlock className="h-4 w-4 mr-1" />
              Desbloquear
            </Button>
          </div>
        )}

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

          {/* Responsável */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-4 w-4" />
              Responsável
            </h3>
            {detailsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : details?.owner ? (
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span className="text-sm font-medium text-foreground">{details.owner.full_name || '-'}</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </span>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{details.owner.email || '-'}</span>
                    {details.owner.email && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyValue(details.owner!.email, 'E-mail')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </span>
                  <span className="text-sm font-medium text-foreground">{details.owner.phone || 'Não informado'}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-sm text-muted-foreground">Último login</span>
                  <span className="text-sm font-medium text-foreground">
                    {details.owner.last_sign_in_at
                      ? format(new Date(details.owner.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : 'Nunca'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Equipe */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Users className="h-4 w-4" />
              Equipe {details ? `(${details.members.length})` : ''}
            </h3>
            {detailsLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : details && details.members.length > 0 ? (
              <div className="grid gap-3">
                {details.members.map((m) => (
                  <div key={m.user_id} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.full_name || m.email || 'Usuário'}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.email || 'Sem e-mail'}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="outline">{ROLE_LABELS[String(m.role)] || m.role || 'Usuário'}</Badge>
                      {m.email && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyValue(m.email, 'E-mail')}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum usuário vinculado.</p>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Uso do plano */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Uso do Plano
            </h3>
            {detailsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : details ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground">Produtos</p>
                  <p className="text-lg font-semibold text-primary">
                    {details.usage.products}
                    <span className="text-xs text-muted-foreground font-normal"> / {formatLimit(details.limits.max_products)}</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground">Usuários</p>
                  <p className="text-lg font-semibold text-primary">
                    {details.usage.users}
                    <span className="text-xs text-muted-foreground font-normal"> / {formatLimit(details.limits.max_users)}</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground">Revendedores</p>
                  <p className="text-lg font-semibold text-primary">
                    {details.usage.resellers}
                    <span className="text-xs text-muted-foreground font-normal"> / {formatLimit(details.limits.max_resellers)}</span>
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border">
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-lg font-semibold text-foreground">{details.usage.sales}</p>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border col-span-2">
                  <p className="text-xs text-muted-foreground">Clientes / Leads</p>
                  <p className="text-lg font-semibold text-foreground">{details.usage.leads}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Não foi possível carregar o uso.</p>
            )}
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

          {onRequestDelete && (
            <>
              <Separator className="bg-border" />
              <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <h3 className="text-sm font-semibold text-destructive uppercase tracking-wide flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Zona de Risco
                </h3>
                <p className="text-xs text-muted-foreground">
                  A exclusão remove definitivamente a empresa, todos os dados e os usuários de acesso.
                  Assinaturas ativas são canceladas automaticamente.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onRequestDelete(company, details?.usage ?? null)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir empresa
                </Button>
              </div>
            </>
          )}
        </div>

      </SheetContent>
    </Sheet>
  );
}