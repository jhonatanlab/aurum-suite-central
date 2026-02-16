import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';
import aurumLogo from '@/assets/aurum-logo.png';

const authSchema = z.object({
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(72, 'Senha muito longa')
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const isCheckoutSuccess = searchParams.get('checkout') === 'success';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema)
  });

  useEffect(() => {
    // Don't redirect if this is a password recovery flow
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate('/reset-password' + hash, { replace: true });
      return;
    }
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast({
              title: 'Credenciais inválidas',
              description: 'Email ou senha incorretos.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Erro ao entrar',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Bem-vindo!',
            description: 'Login realizado com sucesso.'
          });
        }
      } else {
        const { error } = await signUp(data.email, data.password);
        if (error) {
          if (error.message.includes('already registered')) {
            toast({
              title: 'Email já cadastrado',
              description: 'Este email já está em uso. Tente fazer login.',
              variant: 'destructive'
            });
          } else {
            toast({
              title: 'Erro ao cadastrar',
              description: error.message,
              variant: 'destructive'
            });
          }
        } else {
          toast({
            title: 'Conta criada!',
            description: 'Sua conta foi criada com sucesso.'
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={aurumLogo} alt="Aurum Suite" className="h-40 mx-auto mb-3" />
          <p className="text-muted-foreground">Sistema de gestão empresarial</p>
        </div>

        {isCheckoutSuccess &&
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3 animate-fade-in">
            <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Pagamento confirmado! 🎉</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enviamos um e-mail com instruções para definir sua senha. Verifique sua caixa de entrada e spam.
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span>Cheque seu e-mail para acessar sua conta</span>
              </div>
            </div>
          </div>
        }

        <Card className="card-premium">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {isLogin ? 'Entrar' : 'Criar conta'}
            </CardTitle>
            <CardDescription>
              {isLogin ?
              'Acesse sua conta para continuar' :
              'Preencha os dados para criar sua conta'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  {...register('email')}
                  className="bg-secondary border-border" />

                {errors.email &&
                <p className="text-sm text-destructive">{errors.email.message}</p>
                }
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="bg-secondary border-border" />

                {errors.password &&
                <p className="text-sm text-destructive">{errors.password.message}</p>
                }
              </div>

              <Button
                type="submit"
                className="w-full gold-gradient text-primary-foreground font-semibold"
                disabled={isLoading}>

                {isLoading ?
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Aguarde...
                  </> :

                isLogin ? 'Entrar' : 'Cadastrar'
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="ml-1 text-gold hover:underline font-medium">

                  {isLogin ? 'Cadastre-se' : 'Entre'}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>);

}