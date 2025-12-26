import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Calendar, Crown, Save } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  cnpj: z.string().max(18, 'CNPJ inválido').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function MeuNegocio() {
  const [isLoading, setIsLoading] = useState(false);
  const { company, companyUser, updateCompany, loading } = useCompany();
  const { toast } = useToast();

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

        <div className="grid gap-6 md:grid-cols-3">
          {/* Info Cards */}
          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Crown className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <div className="mt-1">{getPlanBadge(company?.plan)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Users className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sua Função</p>
                  <div className="mt-1">{getRoleBadge(companyUser?.role)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gold/10">
                  <Calendar className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Criada em</p>
                  <p className="font-medium">{formatDate(company?.created_at)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Form */}
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

        {/* Team Section (Future) */}
        <Card className="card-premium">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gold/10">
                <Users className="h-5 w-5 text-gold" />
              </div>
              <div>
                <CardTitle>Equipe</CardTitle>
                <CardDescription>Usuários vinculados à empresa</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Gerenciamento de equipe em breve</p>
              <p className="text-sm">Você poderá convidar membros e gerenciar permissões</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
