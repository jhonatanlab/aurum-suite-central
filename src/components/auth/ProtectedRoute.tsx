import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompany';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanUsage } from '@/hooks/usePlanUsage';
import { Loader2 } from 'lucide-react';

// Modules accessible by "vendedor" role
const VENDEDOR_ALLOWED_PATHS = ['/', '/crm', '/vendas'];

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
  const { hasCompany, companyUser, loading: companyLoading } = useCompany();
  const { isAllowed, loading: subLoading } = useSubscription();
  const { blockedPaths, loading: planLoading } = usePlanUsage();
  const location = useLocation();

  // Show loading while auth is resolving
  if (authLoading) {
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

  // Show loading while company or subscription is resolving
  // This prevents premature redirects to /billing during loading
  if (companyLoading || (requireCompany && hasCompany && !skipSubscriptionCheck && subLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold mx-auto" />
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to billing if no company (company is created via payment flow)
  if (requireCompany && !hasCompany) {
    return <Navigate to="/billing" replace />;
  }

  // Check subscription status - redirect to billing if blocked
  if (requireCompany && hasCompany && !skipSubscriptionCheck && !isAllowed) {
    if (location.pathname !== '/billing') {
      return <Navigate to="/billing" replace />;
    }
  }

  // Role-based access: vendedor can only access specific modules
  if (companyUser?.role === 'vendedor' && !VENDEDOR_ALLOWED_PATHS.includes(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Plan-based module blocking: redirect to billing if module is blocked
  if (!planLoading && blockedPaths.some((path) => location.pathname === path || location.pathname.startsWith(path + '/'))) {
    return <Navigate to="/billing" replace />;
  }

  return <>{children}</>;
}
