import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, CreditCard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

const STATUS_LABELS: Record<string, { label: string; description: string }> = {
  canceled: {
    label: 'Cancelada',
    description: 'Sua assinatura foi cancelada. Renove para continuar usando o sistema.',
  },
  unpaid: {
    label: 'Não paga',
    description: 'Há um pagamento pendente na sua assinatura. Atualize seu método de pagamento.',
  },
  incomplete: {
    label: 'Incompleta',
    description: 'Sua assinatura não foi concluída. Finalize o pagamento para acessar o sistema.',
  },
  past_due: {
    label: 'Atrasada',
    description: 'Sua assinatura está com pagamento atrasado. Regularize para continuar.',
  },
};

export default function Billing() {
  const { status, plan } = useSubscription();
  const { signOut } = useAuth();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const statusInfo = STATUS_LABELS[status] || {
    label: 'Bloqueada',
    description: 'Sua conta está temporariamente bloqueada. Entre em contato com o suporte.',
  };

  const handleManageSubscription = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-service', {
        body: { action: 'customer-portal' },
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
        body: { action: 'create-checkout', plan: 'starter' },
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/30 bg-card">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-2xl text-foreground">Acesso Bloqueado</CardTitle>
            <Badge variant="destructive" className="mt-2">
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-center text-sm">
            {statusInfo.description}
          </p>

          {plan && plan !== 'free' && (
            <div className="bg-muted/50 rounded-xl p-4 text-center">
              <p className="text-xs text-muted-foreground">Plano atual</p>
              <p className="text-lg font-semibold text-foreground capitalize">{plan}</p>
            </div>
          )}

          <div className="space-y-3">
            {status === 'canceled' ? (
              <Button
                onClick={handleNewSubscription}
                disabled={loadingCheckout}
                className="w-full bg-gold hover:bg-gold/90 text-black font-semibold"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loadingCheckout ? 'Carregando...' : 'Assinar Novamente'}
              </Button>
            ) : (
              <Button
                onClick={handleManageSubscription}
                disabled={loadingPortal}
                className="w-full bg-gold hover:bg-gold/90 text-black font-semibold"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {loadingPortal ? 'Carregando...' : 'Gerenciar Pagamento'}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={signOut}
              className="w-full border-border text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair da conta
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Após regularizar, atualize a página para acessar o sistema.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
