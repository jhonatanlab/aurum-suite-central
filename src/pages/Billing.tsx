import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import {
  AlertTriangle,
  CreditCard,
  LogOut,
  Crown,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, {
  label: string;
  description: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  icon: typeof CheckCircle2;
}> = {
  active: {
    label: 'Ativa',
    description: 'Sua assinatura está ativa e em dia.',
    variant: 'success',
    icon: CheckCircle2,
  },
  trialing: {
    label: 'Período de teste',
    description: 'Você está no período de teste gratuito.',
    variant: 'info',
    icon: Clock,
  },
  canceling: {
    label: 'Cancelamento agendado',
    description: 'Sua assinatura será cancelada ao final do ciclo atual. Você mantém acesso até lá.',
    variant: 'warning',
    icon: Clock,
  },
  canceled: {
    label: 'Cancelada',
    description: 'Sua assinatura foi cancelada. Renove para continuar usando o sistema.',
    variant: 'error',
    icon: XCircle,
  },
  unpaid: {
    label: 'Não paga',
    description: 'Há um pagamento pendente. Atualize seu método de pagamento.',
    variant: 'warning',
    icon: AlertCircle,
  },
  incomplete: {
    label: 'Incompleta',
    description: 'Sua assinatura não foi concluída. Finalize o pagamento.',
    variant: 'warning',
    icon: AlertCircle,
  },
  past_due: {
    label: 'Atrasada',
    description: 'Pagamento atrasado. Regularize para continuar.',
    variant: 'error',
    icon: AlertTriangle,
  },
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  profissional: 'Profissional',
  growth: 'Growth',
  free: 'Free',
};

const VARIANT_STYLES = {
  success: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
  error: {
    badge: 'bg-destructive/15 text-destructive border-destructive/30',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
  },
  info: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
  },
};

const isBlocked = (status: string) =>
  ['canceled', 'unpaid', 'incomplete', 'past_due'].includes(status);

const AVAILABLE_PLANS = [
  { key: 'starter', label: 'Starter', order: 1 },
  { key: 'profissional', label: 'Profissional', order: 2 },
];

export default function Billing() {
  const { status, plan, loading, currentPeriodEnd, pendingPlanChange } = useSubscription();
  const { signOut } = useAuth();
  const { company } = useCompany();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [loadingPlanChange, setLoadingPlanChange] = useState<string | null>(null);

  const config = STATUS_CONFIG[status] || STATUS_CONFIG.canceled!;
  const styles = VARIANT_STYLES[config.variant];
  const StatusIcon = config.icon;
  const blocked = isBlocked(status);
  const planLabel = PLAN_LABELS[plan] || plan;

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-service', {
        body: { action: 'customer-portal', company_id: company?.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast.error('Erro ao abrir portal de pagamentos');
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleNewSubscription = async () => {
    setLoadingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-service', {
        body: { action: 'create-checkout-session', plan: 'starter', company_id: company?.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Erro ao iniciar checkout');
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você manterá acesso até o final do ciclo atual.')) return;
    setLoadingCancel(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-service', {
        body: { action: 'cancel-subscription', company_id: company?.id },
      });
      if (error) throw error;
      toast.success('Assinatura será cancelada ao final do ciclo');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Cancel error:', err);
      toast.error('Erro ao cancelar assinatura');
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    const PLAN_ORDER: Record<string, number> = { starter: 1, profissional: 2, growth: 3 };
    const isUpgrade = (PLAN_ORDER[newPlan] || 0) > (PLAN_ORDER[plan] || 0);
    const confirmMsg = isUpgrade
      ? `Upgrade para ${PLAN_LABELS[newPlan] || newPlan}? A diferença será cobrada proporcionalmente.`
      : `Downgrade para ${PLAN_LABELS[newPlan] || newPlan}? A mudança será aplicada no próximo ciclo.`;
    if (!confirm(confirmMsg)) return;

    setLoadingPlanChange(newPlan);
    const redirectToCheckout = async () => {
      toast.info('Você ainda não tem assinatura. Redirecionando para checkout...');
      try {
        const { data: checkoutData } = await supabase.functions.invoke('stripe-service', {
          body: { action: 'create-checkout-session', plan: newPlan, company_id: company?.id },
        });
        if (checkoutData?.url) window.open(checkoutData.url, '_blank');
      } catch { toast.error('Erro ao iniciar checkout'); }
    };
    try {
      const { data, error } = await supabase.functions.invoke('stripe-service', {
        body: { action: 'change-plan', company_id: company?.id, new_plan: newPlan },
      });

      // Check both data and error for NO_ACTIVE_SUBSCRIPTION
      const errStr = JSON.stringify(error || '') + JSON.stringify(data || '');
      if (errStr.includes('NO_ACTIVE_SUBSCRIPTION') || errStr.includes('No active subscription')) {
        await redirectToCheckout();
        return;
      }
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.type === 'upgrade') {
        toast.success('Plano atualizado com sucesso!');
      } else {
        toast.success(`Mudança para ${PLAN_LABELS[newPlan]} será aplicada no próximo ciclo.`);
      }
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      // FunctionsHttpError: need to read the response body for the actual error
      let msg = '';
      try {
        if (err?.context?.body) {
          const reader = err.context.body.getReader?.();
          if (reader) {
            const { value } = await reader.read();
            msg = new TextDecoder().decode(value);
          }
        }
        if (!msg && err?.response?.json) {
          const body = await err.response.json();
          msg = JSON.stringify(body);
        }
      } catch {}
      if (!msg) msg = String(err?.message || err || '');
      if (msg.includes('NO_ACTIVE_SUBSCRIPTION') || msg.includes('No active subscription')) {
        await redirectToCheckout();
        return;
      }
      console.error('Change plan error:', err);
      toast.error(msg || 'Erro ao trocar de plano');
    } finally {
      setLoadingPlanChange(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className={`mx-auto w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center`}>
            {blocked ? (
              <StatusIcon className={`h-7 w-7 ${styles.iconColor}`} />
            ) : (
              <Crown className="h-7 w-7 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {blocked ? 'Acesso Bloqueado' : 'Minha Assinatura'}
          </h1>
          {blocked && (
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              {config.description}
            </p>
          )}
        </div>

        {/* Plan Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Plan header */}
            <div className="p-5 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Plano atual
                  </p>
                  <p className="text-xl font-bold text-foreground">{planLabel}</p>
                </div>
                <Badge className={`${styles.badge} border text-xs font-medium px-2.5 py-1`}>
                  <StatusIcon className="h-3 w-3 mr-1.5" />
                  {config.label}
                </Badge>
              </div>
            </div>

            {/* Info rows */}
            <div className="divide-y divide-border/30">
              <div className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span className="text-sm">Status</span>
                </div>
                <span className="text-sm font-medium text-foreground">{config.label}</span>
              </div>

              {currentPeriodEnd && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {blocked ? 'Expirou em' : 'Próxima cobrança'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {format(new Date(currentPeriodEnd), "dd 'de' MMM, yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Change */}
        {(status === 'active' || status === 'trialing') && !blocked && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardContent className="p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Trocar plano
              </p>
              {pendingPlanChange && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-amber-400">
                    Mudança para {PLAN_LABELS[pendingPlanChange] || pendingPlanChange} agendada para o próximo ciclo
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                {AVAILABLE_PLANS.filter(p => p.key !== plan).map(p => {
                  const PLAN_ORDER: Record<string, number> = { starter: 1, profissional: 2, growth: 3 };
                  const isUpgrade = (PLAN_ORDER[p.key] || 0) > (PLAN_ORDER[plan] || 0);
                  return (
                    <Button
                      key={p.key}
                      variant="outline"
                      onClick={() => handleChangePlan(p.key)}
                      disabled={!!loadingPlanChange || pendingPlanChange === p.key}
                      className="flex-1 h-10 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5"
                    >
                      {loadingPlanChange === p.key ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : isUpgrade ? (
                        <ArrowUpCircle className="h-4 w-4 mr-2 text-emerald-400" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4 mr-2 text-amber-400" />
                      )}
                      <span className="text-sm">{p.label}</span>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {status === 'canceled' ? (
            <Button
              onClick={handleNewSubscription}
              disabled={loadingCheckout}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
            >
              {loadingCheckout ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {loadingCheckout ? 'Redirecionando...' : 'Assinar Novamente'}
            </Button>
          ) : (
            <Button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
            >
              {loadingPortal ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {loadingPortal ? 'Abrindo portal...' : 'Gerenciar Pagamento'}
            </Button>
          )}

          {(status === 'active' || status === 'trialing') && (
            <Button
              variant="outline"
              onClick={handleCancelSubscription}
              disabled={loadingCancel}
              className="w-full h-11 border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl"
            >
              {loadingCancel ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {loadingCancel ? 'Cancelando...' : 'Cancelar Assinatura'}
            </Button>
          )}

          {blocked && (
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full h-11 border-border/50 text-muted-foreground hover:text-foreground rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Já regularizei, atualizar
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={signOut}
            className="w-full h-11 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair da conta
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Pagamentos processados com segurança via Stripe.
        </p>
      </div>
    </div>
  );
}
