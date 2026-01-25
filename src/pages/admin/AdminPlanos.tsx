import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Check } from "lucide-react";

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Até 100 leads',
      '1 usuário',
      'WhatsApp básico',
      'Suporte por email',
    ],
    active: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    features: [
      'Leads ilimitados',
      'Até 5 usuários',
      'WhatsApp avançado',
      'Automações',
      'Relatórios',
      'Suporte prioritário',
    ],
    active: true,
  },
  {
    id: 'business',
    name: 'Business',
    price: 249,
    features: [
      'Tudo do Pro',
      'Usuários ilimitados',
      'API completa',
      'Integrações avançadas',
      'Gerente de conta',
      'SLA garantido',
    ],
    active: true,
  },
];

export default function AdminPlanos() {
  return (
    <AdminLayout title="Planos">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Planos</h2>
            <p className="text-muted-foreground">
              Gerencie os planos de assinatura disponíveis.
            </p>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Novo Plano
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="bg-card border-border relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <CreditCard className="h-5 w-5 text-red-500" />
                    {plan.name}
                  </CardTitle>
                  <Badge variant={plan.active ? 'default' : 'secondary'}>
                    {plan.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <span className="text-4xl font-bold text-foreground">
                    R$ {plan.price}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>

                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="pt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1">
                    {plan.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Estatísticas de Assinaturas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-background border border-border text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Plano Free</p>
              </div>
              <div className="p-4 rounded-lg bg-background border border-border text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Plano Pro</p>
              </div>
              <div className="p-4 rounded-lg bg-background border border-border text-center">
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Plano Business</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
