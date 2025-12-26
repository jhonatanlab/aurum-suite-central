import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCompany } from '@/hooks/useCompany';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Crown } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  cnpj: z.string().max(18, 'CNPJ inválido').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

export default function CriarEmpresa() {
  const [isLoading, setIsLoading] = useState(false);
  const { createCompany } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema)
  });

  const onSubmit = async (data: CompanyFormData) => {
    setIsLoading(true);

    try {
      const { error } = await createCompany(data.name, data.cnpj || undefined);
      
      if (error) {
        toast({
          title: 'Erro ao criar empresa',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Empresa criada!',
          description: 'Sua empresa foi cadastrada com sucesso.',
        });
        navigate('/');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <Crown className="h-10 w-10 text-gold" />
            <h1 className="text-3xl font-bold gold-text">Aurum Suite</h1>
          </div>
          <p className="text-muted-foreground">Configure sua empresa para começar</p>
        </div>

        <Card className="card-premium">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 rounded-full bg-gold/10 w-fit">
              <Building2 className="h-8 w-8 text-gold" />
            </div>
            <CardTitle className="text-2xl">Criar Empresa</CardTitle>
            <CardDescription>
              Preencha os dados da sua empresa para começar a usar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                <Label htmlFor="cnpj">CNPJ (opcional)</Label>
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

              <Button
                type="submit"
                className="w-full gold-gradient text-primary-foreground font-semibold mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Cadastrar Empresa'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
