import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCompany } from '@/hooks/useCompany';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Calendar, Crown, Save, Tag, Kanban, CreditCard, Truck, Package, ArrowUpRight, UserPlus, Zap } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { TagManager } from '@/components/tags/TagManager';
import { CrmSettingsPanel } from '@/components/crm/CrmSettingsPanel';
import { PaymentSettingsPanel } from '@/components/pagamentos/PaymentSettingsPanel';
import { SupplierManager } from '@/components/suppliers/SupplierManager';
import { TeamManagementTab } from '@/components/equipe/TeamManagementTab';
import { useNavigate } from 'react-router-dom';
const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  cnpj: z.string().max(18, 'CNPJ inválido').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function MeuNegocio() {
  const [isLoading, setIsLoading] = useState(false);
  const { company, companyUser, updateCompany, loading } = useCompany();
  const { plan, planLabel, limits, usage, loading: planLoading } = usePlanUsage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      cnpj: '',
    }
  });

  useEffect(() => {
    if (company) {
      reset({
        name: company.name || '',
        cnpj: company.cnpj || '',
      });
    }
  }, [company, reset]);

  const onSubmit = async (data: CompanyFormData) => {
    setIsLoading(true);

    try {
      const { error } = await updateCompany({
        name: data.name,
        cnpj: data.cnpj || null,
      });
      
      if (error) {
        toast({
          title: 'Erro ao atualizar',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Dados atualizados!',
          description: 'As informações da empresa foram salvas.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'owner':
        return <Badge className="bg-gold/20 text-gold border-gold/30">Proprietário</Badge>;
      case 'admin':
        return <Badge variant="secondary">Administrador</Badge>;
      default:
        return <Badge variant="outline">Atendente</Badge>;
    }
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-gold/20 text-gold border-gold/30">Pro</Badge>;
      case 'enterprise':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Enterprise</Badge>;
      default:
        return <Badge variant="outline">Gratuito</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout title="Meu Negócio">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Meu Negócio">
      <div className="page-transition space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Meu Negócio</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as informações da sua empresa
          </p>
        </div>

        {/* Plan & Usage Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Plan Card */}
          <Card className="card-premium">
            <CardContent className="pt-6 pb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Plano Atual</p>
                  <p className="text-lg font-bold text-foreground">{planLabel}</p>
                </div>
                {plan !== "growth" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                    onClick={() => navigate("/billing")}
                  >
                    <Zap className="h-3 w-3" />
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products Usage */}
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Produtos</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {planLoading ? "..." : `${usage.products}`}
                  <span className="text-muted-foreground font-normal">
                    /{limits.max_products >= 999999 ? "∞" : limits.max_products}
                  </span>
                </span>
              </div>
              <Progress
                value={limits.max_products >= 999999 ? 5 : Math.min((usage.products / limits.max_products) * 100, 100)}
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Users Usage */}
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Usuários</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {planLoading ? "..." : `${usage.users}`}
                  <span className="text-muted-foreground font-normal">
                    /{limits.max_users >= 999 ? "∞" : limits.max_users}
                  </span>
                </span>
              </div>
              <Progress
                value={limits.max_users >= 999 ? 5 : Math.min((usage.users / limits.max_users) * 100, 100)}
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Resellers Usage */}
          <Card className="card-premium">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Truck className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-xs text-muted-foreground">Revendedores</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {planLoading ? "..." : `${usage.resellers}`}
                  <span className="text-muted-foreground font-normal">
                    /{limits.max_resellers >= 999999 ? "∞" : limits.max_resellers === 0 ? "0" : limits.max_resellers}
                  </span>
                </span>
              </div>
              <Progress
                value={limits.max_resellers <= 0 ? 0 : limits.max_resellers >= 999999 ? 5 : Math.min((usage.resellers / limits.max_resellers) * 100, 100)}
                className="h-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="empresa" className="space-y-6">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="empresa" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <Building2 className="h-4 w-4 mr-2" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="tags" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <Tag className="h-4 w-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="crm" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <Kanban className="h-4 w-4 mr-2" />
              CRM
            </TabsTrigger>
            <TabsTrigger value="pagamentos" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="fornecedores" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <Truck className="h-4 w-4 mr-2" />
              Fornecedores
            </TabsTrigger>
            <TabsTrigger value="equipe" className="data-[state=active]:bg-card data-[state=active]:text-primary">
              <Users className="h-4 w-4 mr-2" />
              Equipe
            </TabsTrigger>
          </TabsList>

          {/* Empresa Tab */}
          <TabsContent value="empresa" className="space-y-6 mt-0">
            <Card className="card-premium">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gold/10">
                    <Building2 className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <CardTitle>Dados da Empresa</CardTitle>
                    <CardDescription>Atualize as informações do seu negócio</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome da Empresa *</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Minha Empresa Ltda"
                        {...register('name')}
                        className="bg-secondary border-border"
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive">{errors.name.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        type="text"
                        placeholder="00.000.000/0000-00"
                        {...register('cnpj')}
                        className="bg-secondary border-border"
                      />
                      {errors.cnpj && (
                        <p className="text-sm text-destructive">{errors.cnpj.message}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="gold-gradient text-primary-foreground font-semibold"
                      disabled={isLoading || !isDirty}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="mt-0">
            <TagManager />
          </TabsContent>

          {/* CRM Settings Tab */}
          <TabsContent value="crm" className="mt-0">
            <CrmSettingsPanel />
          </TabsContent>

          {/* Payment Settings Tab */}
          <TabsContent value="pagamentos" className="mt-0">
            <PaymentSettingsPanel />
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="fornecedores" className="mt-0">
            <SupplierManager />
          </TabsContent>

          {/* Equipe Tab */}
          <TabsContent value="equipe" className="mt-0">
            <TeamManagementTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
