import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useSubscription } from '@/hooks/useSubscription';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireCompany?: boolean;
  skipSubscriptionCheck?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requireCompany = true,
  skipSubscriptionCheck = false 
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { hasCompany, loading: companyLoading } = useCompany();
  const { isAllowed, loading: subLoading } = useSubscription();
  const location = useLocation();

  // Show loading state
  if (authLoading || (user && companyLoading) || (user && hasCompany && !skipSubscriptionCheck && subLoading)) {
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

  // Check subscription status - redirect to billing if blocked
  if (requireCompany && hasCompany && !skipSubscriptionCheck && !isAllowed) {
    // Avoid redirect loop if already on /billing
    if (location.pathname !== '/billing') {
      return <Navigate to="/billing" replace />;
    }
  }

  return <>{children}</>;
}
