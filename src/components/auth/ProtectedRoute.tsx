import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCompany?: boolean;
}

export default function ProtectedRoute({ children, requireCompany = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasCompany, loading: companyLoading } = useCompany();

  // Show loading state
  if (authLoading || (user && companyLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to create company if no company and company is required
  if (requireCompany && !hasCompany) {
    return <Navigate to="/criar-empresa" replace />;
  }

  return <>{children}</>;
}
